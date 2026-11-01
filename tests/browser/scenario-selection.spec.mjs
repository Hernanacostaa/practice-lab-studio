import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { DEMO_SAMPLES } from "../../src/samples.mjs";
import { expectContrast, expectKeyboardFocus } from "./theme-contrast.mjs";

test("selecting an unedited example refreshes both sources and starts the other guide fresh", async ({ page }) => {
  await page.goto("/lab.html?scoutTheme=dark#demo");
  for (const sample of DEMO_SAMPLES) {
    await page.getByRole("combobox", { name: "Choose an example" }).selectOption(sample.id);
    await expect(page.locator("#sample-summary")).toHaveText(sample.summary);
    await expect(page.locator(".input-document > h4")).toHaveText(Object.values(sample.sources).map(({ title }) => title));
    await expect(page.locator("#draft-content")).toBeHidden();
    await page.locator("#generate").click();
    await expect(page.locator("#worksheet-title")).toHaveText(sample.fields.PATitle);
    await expect(page.locator("#field-count")).toHaveText("17 fields / 0 TBD");
    await page.locator("#edit-mode").check();
    await expect(page.locator("#suggested-edit")).toHaveText(sample.suggestedEdit);
    await page.locator("#edit-mode").uncheck();
  }
});

for (const state of ["pending", "applied", "approved"]) {
  test(`switch warning preserves ${state} state on cancel and discards it only on acceptance`, async ({ page }) => {
    await page.goto("/lab.html?scoutTheme=dark#demo");
    await page.locator("#generate").click();
    const field = page.locator('[data-key="ActivityDescription"]');
    const edit = "A fictional trainer introduction to record comparisons.";
    if (state === "approved") {
      await page.locator("#approve").check();
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-json").click()]);
      expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(DEMO_SAMPLES[0].fields);
    } else {
      await page.locator("#edit-mode").check();
      await field.locator("textarea").fill(edit);
      if (state === "applied") await field.getByRole("button", { name: "Apply field", exact: true }).click();
    }
    const trace = await page.locator("#trace").textContent();
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain("discards the current draft");
      await dialog.dismiss();
    });
    await page.locator("#sample-choice").selectOption("service-desk");
    await expect(page.locator("#sample-choice")).toHaveValue("logistics");
    await expect(page.locator("#worksheet-title")).toHaveText(DEMO_SAMPLES[0].fields.PATitle);
    await expect(page.locator("#trace")).toHaveText(trace);
    await expect(page.locator("#approve")).toBeChecked({ checked: state === "approved" });
    await expect(page.locator('[data-preview-key="ActivityDescription"]')).toHaveText(state === "applied" ? edit : DEMO_SAMPLES[0].fields.ActivityDescription);
    if (state !== "approved") await expect(field.locator("textarea")).toHaveValue(edit);
    page.once("dialog", async (dialog) => { await dialog.accept(); });
    await page.locator("#sample-choice").selectOption("service-desk");
    await expect(page.locator("#sample-choice")).toHaveValue("service-desk");
    await expect(page.locator("#draft-content")).toBeHidden();
    await expect(page.locator(".field")).toHaveCount(0);
    await expect(page.locator("#worksheet-title")).toHaveText("");
    await expect(page.locator("#approve")).not.toBeChecked();
    await expect(page.locator("#edit-mode")).not.toBeChecked();
    await expect(page.locator("#download-result")).toBeHidden();
    await expect(page.locator("#trace")).not.toContainText("Logistics");
    await expect(page.locator("#source-assessment")).not.toHaveAttribute("open", "");
    await page.locator("#generate").click();
    await page.locator("#approve").check();
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-json").click()]);
    expect(download.suggestedFilename()).toBe("practice-lab-service-desk.json");
    expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(DEMO_SAMPLES[1].fields);
  });
}

test("switch clears source failures and reset stays on the selected example", async ({ page }) => {
  await page.goto("/lab.html");
  await page.locator(".trace-panel > summary").click();
  for (const id of ["retrieval-failure", "sop-failure"]) await page.locator(`#${id}`).check();
  await page.locator("#generate").click();
  await expect(page.locator("#error")).toBeVisible();
  await page.locator("#sample-choice").selectOption("service-desk");
  await expect(page.locator("#error")).toBeHidden();
  for (const id of ["retrieval-failure", "sop-failure"]) await expect(page.locator(`#${id}`)).not.toBeChecked();
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  await page.locator("#reset").click();
  await expect(page.locator("#sample-choice")).toHaveValue("service-desk");
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator("#approve")).not.toBeChecked();
  await page.locator("#generate").click();
  await expect(page.locator("#worksheet-title")).toHaveText(DEMO_SAMPLES[1].fields.PATitle);
});

for (const theme of ["light", "dark"]) {
  test(`selector is keyboard accessible and readable on narrow screens (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/lab.html?scoutTheme=${theme}#demo`);
    await expectKeyboardFocus(page, "#sample-choice");
    await expectContrast(page, "scenario selector", { selectors: "#sample-choice" });
    await page.locator("#sample-choice").press("ArrowDown");
    await page.locator("#sample-choice").press("Enter");
    await expect(page.locator("#sample-choice")).toHaveValue("service-desk");
    await expect(page.locator("#sample-summary")).toHaveText(DEMO_SAMPLES[1].summary);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("a programmatic switch during export is rejected without changing its payload or filename", async ({ page }) => {
  await page.goto("/lab.html");
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  const [download, state] = await Promise.all([
    page.waitForEvent("download"),
    page.evaluate(() => {
      document.querySelector("#export-docx").click();
      const selector = document.querySelector("#sample-choice");
      const disabled = selector.disabled;
      selector.value = "service-desk";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      return { disabled, selected: selector.value };
    }),
  ]);
  expect(state).toEqual({ disabled: true, selected: "logistics" });
  expect(download.suggestedFilename()).toBe("practice-lab-logistics.docx");
  const xml = strFromU8(unzipSync(await readFile(await download.path()))["word/document.xml"]);
  expect(xml).toContain(DEMO_SAMPLES[0].fields.PATitle);
  expect(xml).not.toContain(DEMO_SAMPLES[1].fields.PATitle);
  await expect(page.locator("#sample-choice")).toBeEnabled();
});

test("reset and a new selection during export suppress the old download", async ({ page }) => {
  const downloads = [];
  page.on("download", (download) => downloads.push(download));
  await page.goto("/lab.html");
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  await page.evaluate(() => {
    document.querySelector("#export-docx").click();
    document.querySelector("#reset").click();
    const selector = document.querySelector("#sample-choice");
    selector.value = "service-desk";
    selector.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#error")).toContainText("draft changed during export");
  await expect(page.locator("#sample-choice")).toHaveValue("service-desk");
  await expect(page.locator("#draft-content")).toBeHidden();
  expect(downloads).toEqual([]);
});

test("invalid scenario selection reports an error instead of creating fallback content", async ({ page }) => {
  await page.goto("/lab.html");
  await page.evaluate(() => {
    const select = document.querySelector("#sample-choice");
    const option = document.createElement("option");
    option.value = "unknown";
    select.append(option);
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#error")).toContainText("selected example is unavailable");
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator("#sample-choice")).toHaveValue("logistics");
});
