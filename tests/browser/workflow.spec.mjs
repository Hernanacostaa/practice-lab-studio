import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

test("fixture workflow produces 17 fields, requires review, and exports valid Word and JSON", async ({ page }) => {
  const failures = [];
  const requests = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  expect(await page.locator("#third-party-licenses").evaluate((element) => element.content.textContent)).toContain("Permission is hereby granted");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await expect(page.locator(".field")).toHaveCount(17);
  await expect(page.getByRole("button", { name: "Download Word" })).toBeDisabled();
  await page.locator("#approve").check();
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download JSON" }).click()]);
  const fields = JSON.parse(await readFile(await json.path(), "utf8"));
  expect(Object.keys(fields)).toHaveLength(17);
  expect(Object.values(fields).every((value) => typeof value === "string")).toBe(true);
  const [word] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Word" }).click()]);
  expect(word.suggestedFilename()).toBe("practice-lab-workshop.docx");
  const parts = unzipSync(await readFile(await word.path()));
  const xml = strFromU8(parts["word/document.xml"]);
  expect(xml).toContain(fields.PATitle);
  expect(xml).toContain("12240");
  expect(failures).toEqual([]);
  expect(requests.every((url) => url.startsWith("http://127.0.0.1:4173/"))).toBe(true);
});

test("source failure never produces a draft and can recover", async ({ page }) => {
  await page.goto("/");
  await page.locator("#retrieval-failure").check();
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator(".field")).toHaveCount(0);
  await page.locator("#retrieval-failure").uncheck();
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await expect(page.locator(".field")).toHaveCount(17);
});

test("pending and applied edits invalidate approval; literal markup is not executed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#approve").check();
  await page.locator("#edit-mode").check();
  const field = page.locator('[data-key="ActivityDescription"]');
  const text = '<img src=x onerror="window.UNSAFE=true"> A fictional revised activity.';
  await field.locator("textarea").fill(text);
  await expect(page.locator("#approve")).not.toBeChecked();
  await expect(page.locator("#approve")).toBeDisabled();
  await expect(page.locator("#export-json")).toBeDisabled();
  await field.getByRole("button", { name: "Apply field" }).click();
  await expect(page.locator("#approve")).toBeEnabled();
  await expect(page.locator("#approve")).not.toBeChecked();
  await page.locator("#edit-mode").uncheck();
  await expect(field.locator(".field-value")).toHaveText(text);
  expect(await page.evaluate(() => window.UNSAFE)).toBeUndefined();
  await page.locator("#approve").check();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-json").click()]);
  const json = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(json.ActivityDescription).toBe(text);
});

test("invalid edits are explicit and do not overwrite the valid draft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#edit-mode").check();
  const field = page.locator('[data-key="ActivityDescription"]');
  const original = await field.locator("textarea").inputValue();
  await field.locator("textarea").fill("");
  await field.getByRole("button", { name: "Apply field" }).click();
  await expect(field.locator(".field-error")).toBeVisible();
  await expect(page.locator("#export-docx")).toBeDisabled();
  await field.getByRole("button", { name: "Discard edit" }).click();
  await expect(field.locator("textarea")).toHaveValue(original);
  await expect(page.locator("#approve")).toBeEnabled();
});

test("all scenarios work and switching or resetting removes previous content", async ({ page }) => {
  await page.goto("/");
  for (const id of ["workshop", "library", "photos"]) {
    await page.locator("#sample-select").selectOption(id);
    await expect(page.locator("#draft-content")).toBeHidden();
    await page.getByRole("button", { name: "Create sample draft" }).click();
    await expect(page.locator(".field")).toHaveCount(17);
    await page.locator("#approve").check();
  }
  await page.getByRole("button", { name: "Reset this demo" }).click();
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator("#sample-select")).toHaveValue("workshop");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("responsive layouts and theme have no horizontal overflow", async ({ page }) => {
  for (const [width, height, theme] of [[390, 844, "light"], [1440, 1000, "dark"]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`/?scoutTheme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "Create sample draft" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme === "dark" ? "light" : "dark");
  }
});

test("multiple pending edits remain visible and cannot bypass review by leaving edit mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#edit-mode").check();
  const description = page.locator('[data-key="ActivityDescription"]');
  const steps = page.locator('[data-key="ActivitySteps"]');
  await description.locator("textarea").fill("A fictional activity with a revised introduction.");
  await steps.locator("textarea").fill("1. Read the fictional guide.\n2. Complete the fictional practice.");
  await description.getByRole("button", { name: "Apply field" }).click();
  await expect(steps.locator("textarea")).toHaveValue("1. Read the fictional guide.\n2. Complete the fictional practice.");
  await page.locator("#edit-mode").uncheck();
  await expect(page.locator("#approve")).toBeDisabled();
  await expect(page.locator("#export-json")).toBeDisabled();
  await page.locator("#edit-mode").check();
  await steps.getByRole("button", { name: "Discard edit" }).click();
  await expect(page.locator("#approve")).toBeEnabled();
  await expect(page.locator("#approve")).not.toBeChecked();
});

test("a new source failure clears a previously approved draft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#approve").check();
  await page.locator("#retrieval-failure").check();
  await expect(page.locator("#approve")).not.toBeChecked();
  await expect(page.locator("#export-docx")).toBeDisabled();
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator(".field")).toHaveCount(0);
});

test("standalone HTML works with network access disabled", async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    const { pathToFileURL } = await import("node:url");
    const { resolve } = await import("node:path");
    await page.goto(pathToFileURL(resolve("dist", "index.html")).href);
    await page.getByRole("button", { name: "Create sample draft" }).click();
    await page.locator("#approve").check();
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-docx").click()]);
    const parts = unzipSync(await readFile(await download.path()));
    expect(parts["word/document.xml"]).toBeDefined();
  } finally {
    await context.close();
  }
});
