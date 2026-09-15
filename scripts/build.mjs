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
const [html, css, bundle] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "src", "style.css"), "utf8"),
  build({
    absWorkingDir: root,
    entryPoints: ["src/app.mjs"],
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
const licenses = await runtimeLicenses();
for (const marker of ["/* INLINE_STYLES */", "/* INLINE_APP */"]) {
  if (!html.includes(marker)) throw new Error(`Missing build marker: ${marker}`);
}
const result = html
  .replace("/* INLINE_STYLES */", () => css)
  .replace("/* INLINE_APP */", () => bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"))
  .replace("</body>", () => `<template id="third-party-licenses">${licenses.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</template>\n</body>`);
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "index.html"), result);
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "third-party-licenses.txt"), licenses);
console.log(`Built self-contained dist/index.html (${Buffer.byteLength(result).toLocaleString()} bytes).`);
