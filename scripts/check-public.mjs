import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";

const root = fileURLToPath(new URL("..", import.meta.url));
const excluded = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const textExtensions = new Set([".md", ".txt", ".json", ".mjs", ".py", ".css", ".html", ".yml", ".yaml", ".svg"]);
const allowedBinary = new Set([".png", ".docx"]);
const patterns = [
  ["corporate SharePoint hostname", /https?:\/\/(?!contoso\.sharepoint\.com)[a-z0-9-]+\.sharepoint\.com/gi],
  ["corporate email address", /[a-z0-9._%+-]+@microsoft\.com/gi],
  ["tenant-specific service URL", /https?:\/\/[a-z0-9.-]+\.(?:environment\.api\.powerplatform|crm[0-9]*\.dynamics)\.com/gi],
  ["credential-shaped value", /\b(?:gh[pousr]_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|sk-[a-zA-Z0-9]{24,})\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["local user path", /[A-Z]:[\\/]+Users[\\/]+[a-z0-9_.-]+/gi],
  ["signed link query", /[?&](?:sig|access_token|client_secret|ovuser)=/gi],
];
const findings = [];
let inspected = 0;
function inspectText(text, name) {
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${name}: ${label}`);
  }
}
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const name = path.relative(root, file);
    if (entry.isSymbolicLink()) { findings.push(`${name}: symlinks are not accepted in the release`); continue; }
    if (entry.isDirectory()) { await walk(file); continue; }
    if (entry.name.startsWith(".env") || /\.(?:zip|mp4|mov|pdf|har|pfx|p12|pem)$/i.test(entry.name)) {
      findings.push(`${name}: non-allowlisted archive, recording, diagnostic, or credential file`);
      continue;
    }
    const extension = path.extname(file);
    if (extension === ".docx") {
      inspected++;
      const parts = unzipSync(new Uint8Array(await readFile(file)));
      for (const [partName, bytes] of Object.entries(parts)) {
        if (/\.(?:xml|rels)$/.test(partName)) {
          const xml = strFromU8(bytes);
          inspectText(xml, `${name}:${partName}`);
          if (partName.endsWith(".rels") && /TargetMode="External"/i.test(xml)) findings.push(`${name}: external document relationship`);
        } else if (!partName.endsWith("/")) findings.push(`${name}: non-XML embedded document part ${partName}`);
      }
      continue;
    }
    if (textExtensions.has(extension) || [".gitignore", ".gitattributes", ".nojekyll", "LICENSE"].includes(entry.name)) {
      inspected++;
      inspectText(await readFile(file, "utf8"), name);
    } else if (!allowedBinary.has(extension)) findings.push(`${name}: unexpected release file type`);
  }
}
await walk(root);
if (findings.length) {
  console.error(`Public-release check failed:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Public-release pattern check passed across ${inspected} text/document files. Human provenance and image review are still required.`);
}
