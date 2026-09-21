import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { FIELD_KEYS } from "../../src/core.mjs";
import { SAMPLES } from "../../src/samples.mjs";
import { expectContrast, expectKeyboardFocus } from "./theme-contrast.mjs";

async function previewValues(page) {
  return page.locator("#worksheet-preview [data-preview-key]").evaluateAll((elements) => Object.fromEntries(
    elements.map((element) => [
      element.dataset.previewKey,
      element.matches("ul, ol")
        ? Array.from(element.children, (line) => line.textContent).join("\n")
        : element.textContent,
    ]),
  ));
}

test("the demo explains the starting point, author's role, honest example, and Word takeaway before a click", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/lab.html");
  await expect(page.locator(".hero-copy")).toContainText("Turn a how-to guide into a training worksheet.");
  await expect(page.locator(".flow-input")).toContainText("A reference guide");
  await expect(page.locator(".flow-output")).toContainText("A practice worksheet");
  await expect(page.locator(".flow-output")).toContainText("Editable in Word");
  await expect(page.locator(".demo-intro")).toContainText("the training author, not the learner");
  await expect(page.locator(".demo-disclosure")).toContainText("No live AI is running here.");
  await expect(page.locator(".demo-disclosure")).toContainText("loads a prepared example");
  await expect(page.getByRole("button", { name: "Create example worksheet", exact: true })).toBeEnabled();
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator(".source-document")).not.toHaveAttribute("open", "");
  await expect(page.locator(".safety-tools")).not.toHaveAttribute("open", "");
  await page.locator(".source-document > summary").click();
  await expect(page.locator("#source-text")).toHaveText(SAMPLES[0].source);
  expect(requests).toEqual(["http://127.0.0.1:4173/lab.html"]);
});

test("every scenario renders all 17 exact fixture values as a readable worksheet without opening field panels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lab.html");
  for (const sample of SAMPLES) {
    await page.locator("#sample-select").selectOption(sample.id);
    await expect(page.locator("#source-audience")).toHaveText(sample.fields.TargetAudience);
    await expect(page.locator("#source-duration")).toHaveText(sample.fields.Duration);
    await page.locator("#generate").click();
    await expect(page.locator("#worksheet-preview")).toBeVisible();
    await expect(page.locator("#fields")).toBeHidden();
    await expect(page.locator("#worksheet-preview [data-preview-key]")).toHaveCount(17);
    const values = await previewValues(page);
    expect(Object.keys(values).sort()).toEqual([...FIELD_KEYS].sort());
    expect(values).toEqual(sample.fields);
    await expect(page.locator("#worksheet-sections h5")).toHaveText([
      "The exercise", "The learning goal", "What learners will practise", "Before you start",
      "For the trainer", "Try it, step by step", "How to check it worked", "Source & references", "Notes & limits",
    ]);
    await expect(page.locator('[data-preview-key="ActivitySteps"] li')).toHaveCount(sample.fields.ActivitySteps.split("\n").length);
    await expect(page.locator("#draft-heading")).toBeFocused();
    await expect(page.locator("#progress-review")).toHaveAttribute("aria-current", "step");
    await expect(page.locator("#export-docx")).toBeDisabled();
    await expect(page.locator(".download-help")).toContainText("editable training worksheet");
  }
});

test("the preview only changes after applying an edit and matches the actual JSON download", async ({ page }) => {
  await page.goto("/lab.html");
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  await page.locator("#edit-mode").check();
  const field = page.locator('.field[data-key="ActivitySteps"]');
  const edited = "Read the fictional guide.\nPractise one alias lookup.\nReset the fictional roster.";
  await field.locator("textarea").fill(edited);
  await page.locator("#edit-mode").uncheck();
  await expect(page.locator("#pending-warning")).toBeVisible();
  await expect(page.locator("#pending-warning")).toContainText("last applied version");
  expect((await previewValues(page)).ActivitySteps).toBe(SAMPLES[0].fields.ActivitySteps);
  await expect(page.locator("#approve")).toBeDisabled();
  await expect(page.locator("#export-json")).toBeDisabled();
  await page.locator("#edit-mode").check();
  await field.getByRole("button", { name: "Apply field", exact: true }).click();
  await page.locator("#edit-mode").uncheck();
  await expect(page.locator("#pending-warning")).toBeHidden();
  await expect(page.locator("#approve")).not.toBeChecked();
  const expected = { ...SAMPLES[0].fields, ActivitySteps: edited };
  expect(await previewValues(page)).toEqual(expected);
  await page.locator("#approve").check();
  const [download] = await Promise.all([
    page.waitForEvent("download"), page.locator("#export-json").click(),
  ]);
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(expected);
  await expect(page.locator("#download-result")).toBeVisible();
  await expect(page.locator("#download-result")).toContainText("same 17 plain-text fields");
  await expect(page.locator("#progress-export")).toHaveClass(/active/);
  await page.locator("#edit-mode").check();
  await field.locator("textarea").fill("An unapplied fictional change.");
  await expect(page.locator("#download-result")).toBeHidden();
  await expect(page.locator("#progress-export")).not.toHaveClass(/active/);
});

test("literal markup stays text in every preview surface, including headings and list items", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/lab.html");
  await page.locator("#generate").click();
  await page.locator("#edit-mode").check();
  await page.locator(".metadata-group > summary").click();
  const text = '<img src="https://invalid.example/pixel" onerror="window.PREVIEW_MARKUP_EXECUTED=true">';
  for (const key of ["PATitle", "ActivityDescription", "ActivitySteps"]) {
    const field = page.locator(`.field[data-key="${key}"]`);
    if (!await field.evaluate((element) => element.open)) await field.locator("summary").click();
    await field.locator("textarea").fill(text);
    await field.getByRole("button", { name: "Apply field", exact: true }).click();
  }
  await page.locator("#edit-mode").uncheck();
  const values = await previewValues(page);
  for (const key of ["PATitle", "ActivityDescription", "ActivitySteps"]) expect(values[key]).toBe(text);
  await expect(page.locator("#worksheet-preview img")).toHaveCount(0);
  expect(await page.evaluate(() => window.PREVIEW_MARKUP_EXECUTED)).toBeUndefined();
  expect(requests).toEqual(["http://127.0.0.1:4173/lab.html"]);
});

test("a missing source clears the old preview, focuses the explicit error, and recovers without a fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lab.html");
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  await page.locator(".safety-tools > summary").click();
  await page.locator("#retrieval-failure").check();
  await page.locator("#generate").click();
  await expect(page.locator("#error")).toBeVisible();
  await expect(page.locator("#error")).toBeFocused();
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator("#worksheet-title")).toHaveText("");
  await expect(page.locator("#worksheet-sections")).toBeEmpty();
  await expect(page.locator("#worksheet-metadata")).toBeEmpty();
  await expect(page.locator(".field")).toHaveCount(0);
  await expect(page.locator("#export-docx")).toBeDisabled();
  await page.locator("#retrieval-failure").uncheck();
  await page.locator("#generate").click();
  await expect(page.locator("#error")).toBeHidden();
  expect(await previewValues(page)).toEqual(SAMPLES[0].fields);
});

test("changing guides and resetting remove both the edited preview and hidden editor contents", async ({ page }) => {
  await page.goto("/lab.html");
  for (const reset of ["change-guide", "reset"]) {
    await page.locator("#generate").click();
    await page.locator("#edit-mode").check();
    await page.locator(".metadata-group > summary").click();
    const title = page.locator('.field[data-key="PATitle"]');
    await title.locator("summary").click();
    await title.locator("textarea").fill("Temporary fictional title to clear.");
    await title.getByRole("button", { name: "Apply field" }).click();
    await page.locator("#edit-mode").uncheck();
    await expect(page.locator("#worksheet-title")).toHaveText("Temporary fictional title to clear.");
    if (reset === "change-guide") await page.locator("#sample-select").selectOption("photos");
    else await page.locator("#reset").click();
    await expect(page.locator("#draft-content")).toBeHidden();
    await expect(page.locator("#worksheet-title")).toHaveText("");
    await expect(page.locator("#worksheet-subtitle")).toHaveText("");
    await expect(page.locator("#worksheet-facts")).toBeEmpty();
    await expect(page.locator("#worksheet-sections")).toBeEmpty();
    await expect(page.locator("#worksheet-metadata")).toBeEmpty();
    await expect(page.locator("#fields")).toBeEmpty();
    await expect(page.locator("#draft-content")).not.toContainText("Temporary fictional title");
    await expect(page.locator("#edit-mode")).not.toBeChecked();
  }
});

test("the source, worksheet, and editing layouts reflow down to 320 CSS pixels in both themes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/lab.html?scoutTheme=${theme}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator("#generate").click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator("#worksheet-preview")).toBeVisible();
      await page.locator("#edit-mode").check();
      const field = page.locator('.field[data-key="ActivityDescription"]');
      await field.locator("textarea").fill("A".repeat(400));
      await field.getByRole("button", { name: "Apply field" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator("#edit-mode").uncheck();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test("new guidance, paper preview, and controls have readable contrast and keyboard access in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto(`/lab.html?scoutTheme=${theme}`);
    await expectContrast(page, `${theme} demo starting state`);
    await expectKeyboardFocus(page, ".source-document > summary");
    await page.locator("#generate").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#draft-heading")).toBeFocused();
    await page.locator(".worksheet-meta > summary").click();
    await expectContrast(page, `${theme} readable worksheet`);
    await expectKeyboardFocus(page, ".worksheet-meta > summary");
    await page.locator("#edit-mode").check();
    await expectContrast(page, `${theme} worksheet editor`);
    await expectKeyboardFocus(page, "#edit-ActivityDescription");
  }
});
