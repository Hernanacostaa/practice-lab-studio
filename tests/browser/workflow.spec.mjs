import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { DEMO_SAMPLES } from "../../src/samples.mjs";
import { FIELD_KEYS, FIELD_LABELS } from "../../src/core.mjs";

function wordFields(bytes) {
  const parts = unzipSync(bytes);
  const xml = strFromU8(parts["word/document.xml"]);
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(([p]) =>
    [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(([, text]) =>
      text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => entities[name])).join(""));
  const result = {};
  let cursor = 0;
  for (const [index, key] of FIELD_KEYS.entries()) {
    const start = paragraphs.indexOf(FIELD_LABELS[key], cursor);
    expect(start).toBeGreaterThanOrEqual(cursor);
    const end = index === FIELD_KEYS.length - 1 ? paragraphs.length : paragraphs.indexOf(FIELD_LABELS[FIELD_KEYS[index + 1]], start + 1);
    result[key] = paragraphs.slice(start + 1, end).join("\n");
    cursor = end;
  }
  expect(xml).toContain('w:w="12240"');
  expect(strFromU8(parts["docProps/core.xml"])).toContain("fictional trainer guide");
  return result;
}

for (const fixture of DEMO_SAMPLES) test.describe(fixture.name, () => {
  const create = async (page) => {
    await page.goto("/lab.html?scoutTheme=dark#demo");
    await page.locator("#sample-choice").selectOption(fixture.id);
    await page.locator("#generate").click();
  };

  test("two-input prepared guide requires review and Word/JSON preserve every current approved value after an edit", async ({ page }) => {
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await create(page);
    expect(await page.locator("#third-party-licenses").evaluate((el) => el.content.textContent)).toContain("Permission is hereby granted");
    await expect(page.locator(".field")).toHaveCount(17);
    await expect(page.locator("#export-docx")).toBeDisabled();
    await page.locator("#approve").check();
    await page.locator("#edit-mode").check();
    const field = page.locator('[data-key="TrainerGuidelines"]');
    await field.locator("summary").click();
    const value = `${fixture.fields.TrainerGuidelines}\n${fixture.suggestedEdit}`;
    await field.locator("textarea").fill(value);
    await expect(page.locator("#approve")).not.toBeChecked();
    await expect(page.locator("#approve")).toBeDisabled();
    await field.getByRole("button", { name: "Apply field" }).click();
    await page.locator("#edit-mode").uncheck();
    await expect(page.locator("#approve")).not.toBeChecked();
    await expect(page.locator("#export-docx")).toBeDisabled();
    await page.locator("#approve").check();
    const expected = { ...fixture.fields, TrainerGuidelines: value };
    const [json] = await Promise.all([page.waitForEvent("download"), page.locator("#export-json").click()]);
    expect(JSON.parse(await readFile(await json.path(), "utf8"))).toEqual(expected);
    const [word] = await Promise.all([page.waitForEvent("download"), page.locator("#export-docx").click()]);
    expect(word.suggestedFilename()).toBe(`practice-lab-${fixture.id}.docx`);
    expect(wordFields(await readFile(await word.path()))).toEqual(expected);
    expect(errors).toEqual([]);
    expect(requests).toEqual(["http://127.0.0.1:4173/lab.html?scoutTheme=dark"]);
  });

  for (const [control, label] of [["retrieval-failure", "assessment"], ["sop-failure", "SOP"]]) {
    test(`${label} failure clears an approved draft, stops creation, and requires restoration plus retry`, async ({ page }) => {
      await create(page);
      await expect(page.locator("#sample-choice")).toHaveValue(fixture.id);
      await page.locator("#approve").check();
      await page.locator(".trace-panel > summary").click();
      await page.locator(`#${control}`).check();
      await expect(page.locator("#approve")).not.toBeChecked();
      await expect(page.locator("#draft-content")).toBeHidden();
      await expect(page.locator("#export-docx")).toBeDisabled();
      await page.locator("#generate").click();
      await expect(page.locator("#error")).toContainText(label);
      await expect(page.locator("#error")).toBeFocused();
      await expect(page.locator(".field")).toHaveCount(0);
      await expect(page.locator("#worksheet-sections")).toBeEmpty();
      await page.locator(`#${control}`).uncheck();
      await expect(page.locator("#draft-content")).toBeHidden();
      await page.locator("#generate").click();
      await expect(page.locator("#error")).toBeHidden();
      await expect(page.locator(".field")).toHaveCount(17);
      await expect(page.locator("#approve")).not.toBeChecked();
    });
  }

  test("reset restores both inputs without keeping a previous draft or browser storage", async ({ page }) => {
    await create(page);
    await page.locator(".trace-panel > summary").click();
    await page.locator("#retrieval-failure").check();
    await page.locator("#sop-failure").check();
    await page.locator("#reset").click();
    for (const id of ["retrieval-failure", "sop-failure"]) await expect(page.locator(`#${id}`)).not.toBeChecked();
    await expect(page.locator("#draft-content")).toBeHidden();
    await expect(page.locator("#worksheet-title")).toHaveText("");
    await page.locator("#generate").click();
    await expect(page.locator(".field")).toHaveCount(17);
    expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
  });

  test("pending edits survive switching view, block review, and can be discarded independently", async ({ page }) => {
    await create(page);
    await page.locator("#approve").check();
    await page.locator("#edit-mode").check();
    const description = page.locator('[data-key="ActivityDescription"]');
    const steps = page.locator('[data-key="ActivitySteps"]');
    await description.locator("textarea").fill("Revised fictional teaching introduction.");
    await steps.locator("textarea").fill("Pending practice sequence, not an applied guide.");
    await description.getByRole("button", { name: "Apply field" }).click();
    await expect(steps.locator("textarea")).toHaveValue("Pending practice sequence, not an applied guide.");
    await page.locator("#edit-mode").uncheck();
    await expect(page.locator("#approve")).toBeDisabled();
    await expect(page.locator("#export-json")).toBeDisabled();
    await page.locator("#edit-mode").check();
    await steps.getByRole("button", { name: "Discard edit" }).click();
    await expect(steps.locator("textarea")).toHaveValue(fixture.fields.ActivitySteps);
    await expect(page.locator("#approve")).toBeEnabled();
    await expect(page.locator("#approve")).not.toBeChecked();
  });

  test("blank and TBD required instructions are rejected without overwriting the applied guide", async ({ page }) => {
    await create(page);
    await page.locator("#edit-mode").check();
    const field = page.locator('[data-key="ActivityDescription"]');
    for (const invalid of ["", "TBD", "TBD."]) {
      await field.locator("textarea").fill(invalid);
      await field.getByRole("button", { name: "Apply field" }).click();
      await expect(field.locator(".field-error")).toBeVisible();
      await expect(page.locator("#export-docx")).toBeDisabled();
      await expect(page.locator('[data-preview-key="ActivityDescription"]')).toHaveText(fixture.fields.ActivityDescription);
      await field.getByRole("button", { name: "Discard edit" }).click();
      await expect(field.locator("textarea")).toHaveValue(fixture.fields.ActivityDescription);
    }
  });

  test("curated connections open complete source passages and current output sections", async ({ page }) => {
    await create(page);
    await page.locator(".source-connections > summary").click();
    await expect(page.locator(".source-connections")).toContainText("links were added by hand");
    await expect(page.locator(".source-connections")).toContainText(/aren.t AI-generated citations/);
    await expect(page.locator("#connections section")).toHaveCount(6);
    await page.locator('#connections a[href="#sop-boundaries"]').click();
    await expect(page.locator("#source-sop")).toHaveAttribute("open", "");
    await expect(page.locator("#sop-boundaries")).toBeVisible();
    await page.locator('#connections a[href="#guide-Notes"]').click();
    await expect(page.locator("#full-guide")).toHaveAttribute("open", "");
    await expect(page.locator("#guide-Notes")).toBeVisible();
  });

  test("required simulation boundaries cannot be removed by a manual Notes edit", async ({ page }) => {
    await create(page);
    await page.locator("#edit-mode").check();
    const field = page.locator('[data-key="Notes"]');
    await field.locator("summary").click();
    await field.locator("textarea").fill("A fictional trainer note without the required boundaries.");
    await field.getByRole("button", { name: "Apply field" }).click();
    await expect(field.locator(".field-error")).toContainText("Keep the two required simulation-boundary");
    await expect(page.locator("#export-docx")).toBeDisabled();
    await field.getByRole("button", { name: "Discard edit" }).click();
    await field.locator("textarea").fill(`${fixture.fields.Notes}\nAdditional fictional trainer note.`);
    await field.getByRole("button", { name: "Apply field" }).click();
    await expect(field.locator(".field-error")).toBeHidden();
    await expect(page.locator("#approve")).toBeEnabled();
    await expect(page.locator("#approve")).not.toBeChecked();
  });

  test("standalone HTML runs and downloads the exact fictional guide with networking disabled", async ({ browser }) => {
    const context = await browser.newContext({ offline: true });
    try {
      const page = await context.newPage();
      const { pathToFileURL } = await import("node:url");
      const { resolve } = await import("node:path");
      await page.goto(pathToFileURL(resolve("dist", "lab.html")).href);
      await page.locator("#sample-choice").selectOption(fixture.id);
      await page.locator("#generate").click();
      await page.locator("#approve").check();
      const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-docx").click()]);
      expect(wordFields(await readFile(await download.path()))).toEqual(fixture.fields);
    } finally {
      await context.close();
    }
  });
});
