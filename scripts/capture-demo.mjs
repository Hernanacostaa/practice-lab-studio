import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL("../dist/index.html?scoutTheme=light", import.meta.url).href);
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#draft-content").waitFor({ state: "visible" });
  await page.evaluate(() => {
    const heading = document.getElementById("demo");
    window.scrollTo({ top: heading.offsetTop - 24, behavior: "instant" });
  });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await page.screenshot({ path: path.join(root, "docs", "demo-preview.png") });
  if (errors.length) throw new Error(`Demo errors during screenshot: ${errors.join("; ")}`);
  console.log("Captured docs/demo-preview.png from the fictional, offline demo.");
} finally {
  await browser.close();
}
