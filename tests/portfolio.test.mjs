import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("personal portfolio identifies the person without inventing a product title or business results", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(html, /<title>Hernan Acosta/);
  assert.match(html, /IT Technical Trainer/);
  assert.match(html, /Global curriculum leadership/);
  assert.match(html, /Mobility/);
  assert.match(html, /Arizona State University/);
  assert.match(html, /self-initiated/i);
  assert.match(html, /PayPal/);
  assert.match(html, /Amazon/);
  assert.doesNotMatch(html, /Principal Product Manager|Senior Product Manager|40%|160 hours|616 learners|9,977|eight.team rollout/);
  assert.match(await readFile(path.join(root, "lab.html"), "utf8"), /not an official Microsoft/i);
  assert.match(html, /pre-authored/);
  assert.match(html, /fictional/);
});

test("portfolio links preserve real project evidence and provide a verified contact destination", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  for (const target of ["lab.html#demo", "case-study.html#decisions", "https://www.linkedin.com/in/hernanacostajr/"]) {
    assert.ok(html.includes(`href="${target}"`), `Missing ${target}`);
  }
  assert.match(html, /rel="canonical" href="https:\/\/hernanacostaa\.github\.io\/practice-lab-studio\/"/);
  assert.match(html, /property="og:image" content="https:\/\/hernanacostaa\.github\.io\/practice-lab-studio\/social-preview\.png"/);
  assert.doesNotMatch(html, /href="(?:#|mailto:|javascript:)"|TODO|lorem ipsum|placeholder/i);
  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(match[0], /rel="noopener noreferrer"/);
  }
});

test("photos are curated local derivatives, not original files or external runtime assets", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const references = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(references.length, 11);
  for (const reference of references) {
    assert.match(reference, /^assets\/portfolio\/[a-z-]+\.webp$/);
    const bytes = await readFile(path.join(root, reference));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString("ascii", offset, offset + 4);
      assert.ok(!["EXIF", "XMP ", "ICCP"].includes(type), `${reference} retains ${type} metadata`);
      const size = bytes.readUInt32LE(offset + 4);
      offset += 8 + size + (size % 2);
    }
    assert.equal(offset, bytes.length, `${reference} has malformed chunks`);
  }
  const assets = await readdir(path.join(root, "assets", "portfolio"));
  assert.deepEqual(assets.sort(), [...references.map((name) => path.basename(name)), "social-preview.png"].sort());
});

test("portfolio runs without external services, hidden persistence, or unsafe content insertion", async () => {
  const [html, source] = await Promise.all([
    readFile(path.join(root, "index.html"), "utf8"),
    readFile(path.join(root, "src", "portfolio.mjs"), "utf8"),
  ]);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|preconnect)/i);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|setInterval)\s*[.(]/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /legacyDemoAnchors/);
  assert.match(source, /window\.print\(\)/);
});

test("personal styling keeps colors in theme tokens and supports motion and print preferences", async () => {
  const [css, palette] = await Promise.all([
    readFile(path.join(root, "src", "portfolio.css"), "utf8"),
    readFile(path.join(root, "src", "palette.css"), "utf8"),
  ]);
  const componentStyles = css.replace(/--cp-[a-z-]+\s*:[^;]+;/g, "");
  assert.doesNotMatch(componentStyles, /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\(/i);
  assert.match(css, /"Segoe UI", Aptos, Calibri/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /@media print/);
  assert.match(palette, /--cp-bg: #f7eddb/);
  assert.match(palette, /--cp-bg: #14232b/);
  assert.match(palette, /--cp-clay:/);
  assert.match(palette, /--cp-sun:/);
  assert.match(palette, /--cp-blue:/);
  assert.match(palette, /--cp-paper:/);
});

test("revised portfolio favors a personal greeting, a clear product CTA, and factual company identification", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(html, /Hi! Nice to meet you\./);
  assert.match(html, /Spotlight Product/);
  assert.match(html, /Two inputs\.<br>One trainer guide/);
  assert.match(html, /microsoft-logo\.webp/);
  assert.match(html, /paypal-logo\.webp/);
  assert.match(html, /amazon-logo\.webp/);
  assert.doesNotMatch(html, /class="through-line"|class="principles"|A problem I knew|I turn complex work<br>/);
});
