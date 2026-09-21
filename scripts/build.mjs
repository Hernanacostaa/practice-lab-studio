import { build } from "esbuild";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, "dist");
async function runtimeLicenses() {
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  const notices = [];
  for (const [location, item] of Object.entries(lock.packages)) {
    if (!location || item.dev || item.optional) continue;
    const directory = path.join(root, ...location.split("/"));
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    const names = await readdir(directory);
    const licenseName = names.find((name) => /^licen[cs]e(?:\.|$)/i.test(name));
    let text;
    if (licenseName) {
      text = await readFile(path.join(directory, licenseName), "utf8");
    } else {
      const readmeName = names.find((name) => /^readme\.md$/i.test(name));
      if (!readmeName) throw new Error(`License notice missing for ${manifest.name}.`);
      const readme = await readFile(path.join(directory, readmeName), "utf8");
      const section = readme.match(/^#{1,6}\s+licen[cs]e\s*$/im);
      if (!section) throw new Error(`License section missing for ${manifest.name}.`);
      text = readme.slice(section.index);
    }
    notices.push(`${manifest.name} ${manifest.version} (${manifest.license})\n${text.trim()}`);
  }
  return `Bundled runtime dependency notices\n\nJSZip is used under its MIT option.\n\n${notices.join("\n\n---\n\n")}\n`;
}
async function inlinePortfolioImages(html) {
  const pattern = /(<img\b[^>]*\ssrc\s*=\s*)(["'])assets\/portfolio\/([a-z]+(?:-[a-z]+)*)\.(webp|png)\2/g;
  const images = new Map(await Promise.all([...html.matchAll(pattern)].map(async ([, , , name, extension]) => {
    const filename = `${name}.${extension}`;
    const bytes = await readFile(path.join(root, "assets", "portfolio", filename));
    return [filename, `data:image/${extension};base64,${bytes.toString("base64")}`];
  })));
  return html.replace(pattern, (_, prefix, quote, name, extension) => `${prefix}${quote}${images.get(`${name}.${extension}`)}${quote}`);
}

const [palette, css, labCss, storyCss, portfolioCss, licenses, socialPreview] = await Promise.all([
  readFile(path.join(root, "src", "palette.css"), "utf8"),
  readFile(path.join(root, "src", "style.css"), "utf8"),
  readFile(path.join(root, "src", "lab.css"), "utf8"),
  readFile(path.join(root, "src", "story.css"), "utf8"),
  readFile(path.join(root, "src", "portfolio.css"), "utf8"),
  runtimeLicenses(),
  readFile(path.join(root, "assets", "portfolio", "social-preview.png")),
]);
const pages = [
  { filename: "index.html", entry: "src/portfolio.mjs", styles: `${palette}\n${portfolioCss}`, includeLicenses: false },
  { filename: "lab.html", entry: "src/app.mjs", styles: `${palette}\n${css}\n${labCss}`, includeLicenses: true },
  { filename: "case-study.html", entry: "src/story.mjs", styles: `${palette}\n${css}\n${storyCss}`, includeLicenses: false },
];
const results = await Promise.all(pages.map(async (page) => {
  const [html, bundle] = await Promise.all([
    readFile(path.join(root, page.filename), "utf8"),
    build({
      absWorkingDir: root,
      entryPoints: [page.entry],
      bundle: true,
      write: false,
      minify: true,
      sourcemap: false,
      format: "iife",
      platform: "browser",
      target: ["es2022"],
      legalComments: "inline",
    }),
  ]);
  for (const marker of ["/* INLINE_STYLES */", "/* INLINE_APP */"]) {
    if (html.split(marker).length !== 2) throw new Error(`Expected exactly one build marker in ${page.filename}: ${marker}`);
  }
  let content = (await inlinePortfolioImages(html))
    .replace("/* INLINE_STYLES */", () => page.styles)
    .replace("/* INLINE_APP */", () => bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"));
  if (page.includeLicenses) {
    content = content.replace("</body>", () => `<template id="third-party-licenses">${licenses.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</template>\n</body>`);
  }
  if (/\/\*\s*INLINE_[A-Z_]+\s*\*\//.test(content)) throw new Error(`Unresolved build marker in ${page.filename}.`);
  if (/<(?:img|script|source)\b[^>]*\s(?:src|srcset)\s*=\s*(["'])(?!data:|blob:)[^"']*\1/i.test(content)) {
    throw new Error(`Unbundled runtime asset in ${page.filename}; use an approved inline portfolio image or bundled script.`);
  }
  return { filename: page.filename, content: content.replaceAll("\r\n", "\n") };
}));
await mkdir(output, { recursive: true });
for (const { filename, content } of results) {
  await writeFile(path.join(output, filename), content);
  console.log(`Built self-contained dist/${filename} (${Buffer.byteLength(content).toLocaleString()} bytes).`);
}
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "third-party-licenses.txt"), licenses.replaceAll("\r\n", "\n"));
await writeFile(path.join(output, "social-preview.png"), socialPreview);
