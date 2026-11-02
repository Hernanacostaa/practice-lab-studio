import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("every page links to the unchanged hosted resume without leaving the active page", async ({ page, request }) => {
  const original = await readFile(resolve("assets", "hernan-acosta-resume.pdf"));
  const response = await request.get("/assets/hernan-acosta-resume.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(await response.body()).toEqual(original);
  expect(await readFile(resolve("dist", "assets", "hernan-acosta-resume.pdf"))).toEqual(original);
  for (const route of ["/", "/lab.html", "/case-study.html"]) {
    await page.goto(route + "?scoutTheme=light");
    const link = page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Resume", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "assets/hernan-acosta-resume.pdf");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await page.setViewportSize({ width: 320, height: 900 });
    await expect(link).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});
