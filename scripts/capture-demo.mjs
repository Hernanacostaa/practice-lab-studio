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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(new URL("../dist/lab.html?scoutTheme=dark", import.meta.url).href);
  if (process.env.DEMO_EVIDENCE_DIR) {
    const evidence = path.resolve(process.env.DEMO_EVIDENCE_DIR);
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, "pane-initial-wide.png") });
  }
  await page.getByRole("button", { name: "Create prepared trainer guide" }).click();
  await page.locator("#draft-content").waitFor({ state: "visible" });
  await page.evaluate(() => {
    document.getElementById("demo").scrollTop = document.querySelector(".draft-panel").offsetTop - document.getElementById("demo").offsetTop - 56;
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await page.screenshot({ path: path.join(root, "docs", "demo-preview.png") });
  if (process.env.DEMO_EVIDENCE_DIR) {
    const evidence = path.resolve(process.env.DEMO_EVIDENCE_DIR);
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: path.join(evidence, "trainer-guide-wide.png"), fullPage: true });
    await page.getByRole("tab", { name: "Technical outline", exact: true }).click();
    await page.screenshot({ path: path.join(evidence, "technical-outline-wide.png"), fullPage: true });
    await page.getByRole("tab", { name: "Story", exact: true }).click();
    await page.locator("#approve").check();
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-docx").click()]);
    await download.saveAs(path.join(evidence, "reviewed-trainer-guide.docx"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: path.join(evidence, "trainer-guide-mobile.png"), fullPage: true });
    await page.getByRole("tab", { name: "Technical outline", exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: path.join(evidence, "technical-outline-mobile.png"), fullPage: true });
    await page.getByRole("tab", { name: "Story", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 978 });
    await page.locator("#approve").uncheck();
    await page.evaluate(() => {
      document.getElementById("demo").scrollTop = document.querySelector(".draft-panel").offsetTop - document.getElementById("demo").offsetTop - 56;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({ path: path.join(evidence, "portfolio-demo-preview.png") });
  }
  if (errors.length) throw new Error(`Demo errors during screenshot: ${errors.join("; ")}`);
  console.log("Captured docs/demo-preview.png from the fictional, offline demo.");
} finally {
  await browser.close();
}
