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
const [css, storyCss, licenses] = await Promise.all([
  readFile(path.join(root, "src", "style.css"), "utf8"),
  readFile(path.join(root, "src", "story.css"), "utf8"),
  runtimeLicenses(),
]);
const pages = [
  { filename: "index.html", entry: "src/app.mjs", styles: css, includeLicenses: true },
  { filename: "case-study.html", entry: "src/story.mjs", styles: `${css}\n${storyCss}`, includeLicenses: false },
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
    if (!html.includes(marker)) throw new Error(`Missing build marker in ${page.filename}: ${marker}`);
  }
  let content = html
    .replace("/* INLINE_STYLES */", () => page.styles)
    .replace("/* INLINE_APP */", () => bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"));
  if (page.includeLicenses) {
    content = content.replace("</body>", () => `<template id="third-party-licenses">${licenses.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</template>\n</body>`);
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
