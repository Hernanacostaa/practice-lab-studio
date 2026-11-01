import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { FIELD_KEYS } from "../../src/core.mjs";
import { DEMO_SAMPLES as SAMPLES } from "../../src/samples.mjs";
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
  await expect(page.locator(".hero-copy")).toContainText("training-needs assessments and operating procedures");
  await expect(page.locator(".hero-copy")).toContainText("AI combined the source material into a draft");
  await expect(page.locator(".hero-copy")).toContainText("automation assembled the document for review");
  await expect(page.locator("#project-story")).toContainText("I built the workflow in Copilot Studio and Power Automate");
  await expect(page.locator("#design > p")).toHaveCount(2);
  await expect(page.locator("#design")).toContainText("download Word");
  await expect(page.locator(".design-card")).toHaveCount(0);
  await expect(page.locator(".demo-intro")).toContainText("Try it as the training author");
  await expect(page.locator(".demo-disclosure")).toContainText("No live AI is running here");
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.locator(".demo-disclosure")).toContainText("a prepared example you can edit and download");
  await expect(page.getByRole("combobox", { name: "Choose an example" })).toHaveValue("logistics");
  await expect(page.locator("#sample-choice option")).toHaveText(["Logistics", "IT service desk"]);
  await expect(page.locator("#scenario-context")).toContainText("not projects I deployed in these industries");
  await expect(page.getByRole("button", { name: "Create prepared trainer guide", exact: true })).toBeEnabled();
  await expect(page.locator("#draft-content")).toBeHidden();
  await expect(page.locator("#source-assessment")).not.toHaveAttribute("open", "");
  await expect(page.locator("#source-sop")).not.toHaveAttribute("open", "");
  await expect(page.locator(".input-document")).toHaveCount(2);
  await expect(page.locator(".safety-tools, .source-hint")).toHaveCount(0);
  await expect(page.locator(".trace-panel")).not.toHaveAttribute("open", "");
  for (const id of ["retrieval-failure", "sop-failure"]) await expect(page.locator(`#${id}`)).toBeHidden();
  await expect(page.locator(".trace-panel input")).toHaveCount(2);
  await page.locator("#source-assessment > summary").click();
  await expect(page.locator("#assessment-skills p")).toHaveText(SAMPLES[0].sources.assessment.sections[1].text);
  await page.locator("#source-sop > summary").click();
  await expect(page.locator("#sop-boundaries p")).toHaveText(SAMPLES[0].sources.sop.sections[3].text);
  expect(requests).toEqual(["http://127.0.0.1:4173/lab.html"]);
});

test("desktop keeps the case study beside an independently scrollable demo, with a natural mobile fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/lab.html?scoutTheme=dark#demo");
  const story = page.locator("#project-story");
  const demo = page.locator("#demo");
  const storyBox = await story.boundingBox();
  const demoBox = await demo.boundingBox();
  expect(Math.abs(storyBox.y - demoBox.y)).toBeLessThan(2);
  expect(storyBox.x + storyBox.width).toBeLessThan(demoBox.x);
  expect(demoBox.width).toBeGreaterThan(700);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(1100);
  await expectKeyboardFocus(page, "#project-story");
  await expectKeyboardFocus(page, "#demo");
  await story.evaluate((element) => { element.scrollTop = 0; });
  const storyScroll = await story.evaluate((element) => element.scrollTop);
  await page.locator("#generate").click();
  await expect(page.locator("#draft-heading")).toBeFocused();
  await page.locator("#approve").check();
  await expect(page.locator("#export-docx")).toBeEnabled();
  expect(await demo.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
  const after = await story.boundingBox();
  expect(Math.abs(after.y - storyBox.y)).toBeLessThan(2);
  expect(await story.evaluate((element) => element.scrollTop)).toBe(storyScroll);
  await expect(page.locator("#project-story-title")).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await demo.evaluate((element) => getComputedStyle(element).overflowY)).toBe("visible");
  const mobileStory = await story.boundingBox();
  const mobileDemo = await demo.boundingBox();
  expect(mobileDemo.y).toBeGreaterThanOrEqual(mobileStory.y + mobileStory.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("technical tabs identify AI, automation and RAG scope without changing drafts, edits or approval", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lab.html?scoutTheme=dark");
  await page.locator("#generate").click();
  await page.locator("#approve").check();
  const before = await previewValues(page);
  const story = page.getByRole("tab", { name: "Story", exact: true });
  const technical = page.getByRole("tab", { name: "Technical outline", exact: true });
  await technical.click();
  await expect(technical).toHaveAttribute("aria-selected", "true");
  await expect(technical).toHaveAttribute("tabindex", "0");
  await expect(story).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("tabpanel", { name: "Technical outline", exact: true })).toBeVisible();
  await expect(page.locator("#technical-outline > h3").first()).toHaveText("Source-grounded generative AI workflow");
  await expect(page.locator("#case-story")).toBeHidden();
  await expect(page.locator(".technical-steps > li")).toHaveCount(5);
  const flow = page.getByRole("figure", { name: "Two source documents become one reviewed guide." });
  await expect(flow).toBeVisible();
  await expect(flow.getByRole("list", { name: "Required source documents" }).locator("h4")).toHaveText(["Training needs", "Operating procedures"]);
  await expect(flow.getByRole("list", { name: "Trainer-guide workflow" }).locator("h4")).toHaveText(["Check both inputs", "Draft the guide", "Check and revise", "Approve this version", "Create Word"]);
  await expect(flow.locator(".technical-role")).toHaveText(["Automation", "AI", "AI + automation", "Human + automation", "AI + automation"]);
  await expect(flow.locator(".technical-steps > li").first()).toContainText("If either document is missing, drafting stops");
  await expect(flow.locator(".technical-steps > li").nth(3)).toContainText("Any edit clears approval");
  for (const name of ["Copilot Studio", "ExtractPA", "EditPA", "FormatPreview", "GenerateDoc", "GeneratePA", "Power Automate"]) {
    await expect(page.locator("#technical-outline")).toContainText(name);
  }
  await expect(page.locator("#technical-outline")).toContainText("repo leaves the reader unconfigured");
  await expect(page.locator("#technical-outline")).toContainText("don’t confirm retrieval in the original system");
  await expect(page.locator("#technical-outline")).toContainText("doesn’t run these prompts or flows");
  await expect(page.locator("#approve")).toBeChecked();
  await expect(page.locator("#export-docx")).toBeEnabled();
  expect(await previewValues(page)).toEqual(before);
  await expectKeyboardFocus(page, "#technical-tab");
  await expectContrast(page, "technical outline text");
  await expectContrast(page, "selected technical tab", { kind: "surface", selectors: "#technical-tab" });
  await technical.press("ArrowRight");
  await expect(story).toBeFocused();
  await expect(story).toHaveAttribute("aria-selected", "true");
  await story.press("ArrowLeft");
  await expect(technical).toBeFocused();
  await technical.press("Home");
  await expect(story).toBeFocused();
  await story.press("End");
  await expect(technical).toBeFocused();
  await story.click();
  await page.locator("#edit-mode").check();
  const field = page.locator('.field[data-key="ActivityDescription"]');
  const edit = "Practise comparing each fictional receipt against its ASN before writing a review card.";
  await field.locator("textarea").fill(edit);
  await technical.click();
  await expect(field.locator("textarea")).toHaveValue(edit);
  await expect(page.locator("#approve")).not.toBeChecked();
  await expect(page.locator("#approve")).toBeDisabled();
  expect(await previewValues(page)).toEqual(before);
  await story.click();
  await field.getByRole("button", { name: "Apply field", exact: true }).click();
  await page.locator("#approve").check();
  await technical.click();
  await expect(page.locator("#approve")).toBeChecked();
  expect(await previewValues(page)).toEqual({ ...before, ActivityDescription: edit });
});

test("technical outline supports offline deep links, legacy anchors, narrow themes and no-JavaScript reading", async ({ browser }) => {
  const context = await browser.newContext({ offline: true, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    for (const [width, theme] of [[320, "light"], [320, "dark"], [768, "light"], [1440, "dark"]]) {
      await page.setViewportSize({ width, height: 900 });
      const url = pathToFileURL(resolve("dist", "lab.html"));
      url.search = `?scoutTheme=${theme}`;
      url.hash = "technical-outline";
      await page.goto(url.href);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("#technical-tab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#technical-outline")).toBeVisible();
      await expect(page.locator("#sample-choice")).toBeEnabled();
      await expectContrast(page, `${theme} technical outline (${width}px)`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const geometry = await page.locator(".architecture-flow").evaluate((flow) => {
        const bounds = flow.getBoundingClientRect();
        const inputs = [...flow.querySelectorAll(".flow-inputs > li")].map((node) => node.getBoundingClientRect());
        const nodes = [...flow.querySelectorAll(".technical-steps > li")];
        const boxes = nodes.map((node) => node.getBoundingClientRect());
        return {
          sourcesAboveDrafting: inputs.every((box) => box.bottom < boxes[0].top),
          nodesStayInsideFlow: [...inputs, ...boxes].every((box) => box.left >= bounds.left && box.right <= bounds.right),
          stagesFollowInOrder: boxes.every((box, index) => index === 0 || box.top > boxes[index - 1].bottom),
          connectingLines: nodes.slice(0, -1).every((node) => getComputedStyle(node, "::after").borderLeftWidth === "2px" && getComputedStyle(node, "::before").transform !== "none"),
          inputsConverge: getComputedStyle(flow.querySelector(".flow-inputs"), "::after").borderTopWidth === "2px",
        };
      });
      expect(geometry).toEqual({ sourcesAboveDrafting: true, nodesStayInsideFlow: true, stagesFollowInOrder: true, connectingLines: true, inputsConverge: true });
      await expect(page.locator(".technical-references")).toHaveCount(0);
      await expect(page.locator("#technical-outline")).not.toContainText("Architecture sources in this repo");
      await page.evaluate(() => { window.location.hash = "design"; });
      await expect(page.locator("#story-tab")).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("#design")).toBeVisible();
    }
  } finally {
    await context.close();
  }
  const noScript = await browser.newContext({ javaScriptEnabled: false, offline: true });
  try {
    const page = await noScript.newPage();
    await page.goto(pathToFileURL(resolve("dist", "lab.html")).href);
    await expect(page.locator("#case-tabs")).toBeHidden();
    await expect(page.locator("#case-story")).toBeVisible();
    await expect(page.locator("#technical-outline")).toBeVisible();
    await expect(page.locator("#sample-choice")).toBeDisabled();
    await expect(page.getByRole("figure", { name: "Two source documents become one reviewed guide." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Is it RAG?", exact: true })).toBeVisible();
  } finally {
    await noScript.close();
  }
});

test("every scenario renders all 17 exact fixture values as a readable worksheet without opening field panels", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lab.html");
  for (const sample of SAMPLES) {
    await page.locator("#sample-choice").selectOption(sample.id);
    await page.locator("#generate").click();
    await expect(page.locator("#worksheet-preview")).toBeVisible();
    await expect(page.locator("#fields")).toBeHidden();
    await expect(page.locator("#worksheet-preview [data-preview-key]")).toHaveCount(17);
    await expect(page.locator('[data-preview-key="TargetAudience"]')).toHaveText(sample.fields.TargetAudience);
    await expect(page.locator('[data-preview-key="Duration"]')).toHaveText(sample.fields.Duration);
    await expect(page.locator("#full-guide")).not.toHaveAttribute("open", "");
    await expect(page.locator("#guide-overview")).toContainText("Demonstrate");
    await expect(page.locator("#guide-overview")).toContainText("Simulation only");
    await expect(page.locator("#draft-heading")).toBeFocused();
    await page.locator("#full-guide > summary").click();
    const values = await previewValues(page);
    expect(Object.keys(values).sort()).toEqual([...FIELD_KEYS].sort());
    expect(values).toEqual(sample.fields);
    await expect(page.locator("#worksheet-sections h5")).toHaveText([
      "What to teach and why", "Intended learning outcome", "Required competencies", "Tooling and trainer preparation",
      "Trainer briefing and demonstration", "Trainer-led sequence and learner practice", "Individual exercise completion criteria",
      "Source & references", "Safety callouts and simulation boundaries",
    ]);
    await expect(page.locator('[data-preview-key="ActivitySteps"] li')).toHaveCount(sample.fields.ActivitySteps.split("\n").length);
    await expect(page.locator("#progress-review")).toHaveAttribute("aria-current", "step");
    await expect(page.locator("#export-docx")).toBeDisabled();
    await expect(page.locator(".download-help")).toContainText("editable trainer guide");
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
  await page.locator(".trace-panel > summary").click();
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
  for (const reset of ["source-failure", "reset"]) {
    await page.locator("#reset").click();
    await page.locator("#generate").click();
    await page.locator("#edit-mode").check();
    await page.locator(".metadata-group > summary").click();
    const title = page.locator('.field[data-key="PATitle"]');
    await title.locator("summary").click();
    await title.locator("textarea").fill("Temporary fictional title to clear.");
    await title.getByRole("button", { name: "Apply field" }).click();
    await page.locator("#edit-mode").uncheck();
    await expect(page.locator("#worksheet-title")).toHaveText("Temporary fictional title to clear.");
    if (reset === "source-failure") {
      await page.locator(".trace-panel > summary").click();
      await page.locator("#sop-failure").check();
    } else await page.locator("#reset").click();
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
    await expectKeyboardFocus(page, "#source-assessment > summary");
    await expectKeyboardFocus(page, "#source-sop > summary");
    await page.locator("#generate").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#draft-heading")).toBeFocused();
    await page.locator("#full-guide > summary").click();
    await page.locator(".worksheet-meta > summary").click();
    await expectContrast(page, `${theme} readable worksheet`);
    await expectKeyboardFocus(page, ".worksheet-meta > summary");
    await page.locator("#edit-mode").check();
    await expectContrast(page, `${theme} worksheet editor`);
    await expectKeyboardFocus(page, "#edit-ActivityDescription");
  }
});
