import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("..", import.meta.url));
const excluded = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const textExtensions = new Set([".md", ".txt", ".json", ".mjs", ".py", ".css", ".html", ".yml", ".yaml", ".svg"]);
const imageExtensions = new Set([".png", ".webp"]);
const approvedResumeHash = "76559603dbf5aabd54627bca09e4bd6c38160c71c4d7126a4fd9b268a6256475";

export function isApprovedResume(bytes, name) {
  return /^(?:dist[\\/])?assets[\\/]hernan-acosta-resume\.pdf$/.test(name)
    && createHash("sha256").update(bytes).digest("hex") === approvedResumeHash;
}
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

export function inspectImageMetadata(bytes, extension) {
  const issues = [];
  if (extension === ".png") {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!bytes.subarray(0, 8).equals(signature)) return ["invalid PNG signature"];
    let offset = 8;
    let ended = false;
    while (offset < bytes.length) {
      if (offset + 12 > bytes.length) return [...issues, "truncated PNG chunk"];
      const length = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      if (offset + 12 + length > bytes.length) return [...issues, "truncated PNG chunk"];
      if (["eXIf", "tEXt", "zTXt", "iTXt", "tIME"].includes(type)) {
        issues.push(`PNG ${type} metadata must be removed`);
      }
      offset += 12 + length;
      if (type === "IEND") {
        if (length !== 0 || offset !== bytes.length) issues.push("invalid PNG end chunk or trailing data");
        ended = true;
        break;
      }
    }
    if (!ended) issues.push("PNG end chunk missing");
    return issues;
  }
  if (extension === ".webp") {
    if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF"
      || bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.readUInt32LE(4) + 8 !== bytes.length) {
      return ["invalid WebP RIFF container"];
    }
    let offset = 12;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) return [...issues, "truncated WebP chunk"];
      const type = bytes.toString("ascii", offset, offset + 4);
      const length = bytes.readUInt32LE(offset + 4);
      const end = offset + 8 + length + (length % 2);
      if (end > bytes.length) return [...issues, "truncated WebP chunk"];
      if (type === "EXIF" || type === "XMP ") issues.push(`WebP ${type.trim()} metadata must be removed`);
      if (type === "VP8X" && length > 0 && (bytes[offset + 8] & 0x0c)) {
        issues.push("WebP EXIF/XMP metadata flags must be removed");
      }
      offset = end;
    }
    return issues;
  }
  throw new Error(`Unsupported image format: ${extension}`);
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const name = path.relative(root, file);
    if (entry.isSymbolicLink()) { findings.push(`${name}: symlinks are not accepted in the release`); continue; }
    if (entry.isDirectory()) { await walk(file); continue; }
    if (path.extname(file).toLowerCase() === ".pdf" && isApprovedResume(await readFile(file), name)) {
      inspected++;
      continue;
    }
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
    if (imageExtensions.has(extension)) {
      inspected++;
      if (extension === ".webp" && !/^assets[\\/]portfolio[\\/][a-z]+(?:-[a-z]+)*\.webp$/.test(name)) {
        findings.push(`${name}: WebP files are limited to approved portfolio images`);
      }
      for (const issue of inspectImageMetadata(await readFile(file), extension)) findings.push(`${name}: ${issue}`);
      continue;
    }
    if (textExtensions.has(extension) || [".gitignore", ".gitattributes", ".nojekyll", "LICENSE"].includes(entry.name)) {
      inspected++;
      inspectText(await readFile(file, "utf8"), name);
    } else findings.push(`${name}: unexpected release file type`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await walk(root);
  if (findings.length) {
    console.error(`Public-release check failed:\n${findings.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Public-release pattern check passed across ${inspected} text/document/image files. Human provenance and image review are still required.`);
  }
}
