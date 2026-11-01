import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

test("all built pages resolve the exact supplied favicon offline under their content policy", async ({ browser }) => {
  const bytes = await readFile(resolve("assets", "favicon.png"));
  const expectedHref = `data:image/png;base64,${bytes.toString("base64")}`;
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    const icons = [];
    for (const filename of ["index.html", "lab.html", "case-study.html"]) {
      await page.goto(pathToFileURL(resolve("dist", filename)).href);
      const icon = page.locator('link[rel="icon"]');
      await expect(icon).toHaveCount(1);
      const href = await icon.getAttribute("href");
      expect(href).toBe(expectedHref);
      icons.push(href);
      const result = await page.evaluate(async () => {
        const image = new Image();
        image.src = document.querySelector('link[rel="icon"]').href;
        await image.decode();
        const sizes = [16, 32, 64].map((size) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, size, size);
          const pixels = ctx.getImageData(0, 0, size, size).data;
          return [...pixels].some((value, index) => index % 4 === 3 && value > 0);
        });
        return { width: image.naturalWidth, height: image.naturalHeight, sizes };
      });
      expect(result.width).toBe(128);
      expect(result.height).toBe(128);
      expect(result.sizes).toEqual([true, true, true]);
    }
    expect(new Set(icons).size).toBe(1);
  } finally {
    await context.close();
  }
});
