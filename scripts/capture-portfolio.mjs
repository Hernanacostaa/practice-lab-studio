import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(new URL("../dist/index.html?scoutTheme=dark", import.meta.url).href);
  await page.locator("main img").evaluateAll(async (images) => {
    images.forEach((image) => { image.loading = "eager"; });
    await Promise.all(images.map((image) => image.decode()));
  });
  if (process.env.PORTFOLIO_EVIDENCE_DIR) {
    const evidence = path.resolve(process.env.PORTFOLIO_EVIDENCE_DIR);
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, "homepage-desktop.png"), fullPage: true });
    await page.locator("#work").screenshot({ path: path.join(evidence, "selected-work-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(evidence, "homepage-mobile.png"), fullPage: true });
    await page.locator("#work").screenshot({ path: path.join(evidence, "selected-work-mobile.png") });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.addStyleTag({ content: `
    .site-header, .intro-actions { display: none; }
    .wrap { width: 1104px; }
    .intro { height: 630px; padding: 32px 0; gap: 48px; }
    .intro h1 { font-size: 72px; }
    .hello { font-size: 20px; }
    .hero-hook { font-size: 28px; }
    .intro-copy { font-size: 14px; margin-top: 16px; }
    .portrait { max-width: 320px; }
  ` });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: path.join(root, "assets", "portfolio", "social-preview.png") });
  console.log("Captured balanced portfolio social preview and requested desktop/mobile evidence.");
} finally {
  await browser.close();
}
