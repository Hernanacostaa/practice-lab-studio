import { test, expect } from "@playwright/test";
import { expectContrast, expectKeyboardFocus } from "./theme-contrast.mjs";

const routes = [
  { name: "demo", path: "/" },
  { name: "story", path: "/case-study.html" },
];

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function expectLightPalette(page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 244, 239)");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(36, 36, 36)");
  await expect(page.locator(".hero-actions .primary")).toHaveCSS("background-color", "rgb(177, 31, 75)");
  await expect(page.locator("h1 span")).toHaveCSS("color", "rgb(177, 31, 75)");
}

for (const width of [320, 390, 1440]) {
  for (const route of routes) {
    test(`${route.name}: dark text, helper labels, responsive layout and theme switching at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.goto(`${route.path}?scoutTheme=dark`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expectNoPageOverflow(page);
      const initial = await expectContrast(page, `${route.name} ${width}px initial`);
      expect(initial.length).toBeGreaterThan(50);

      if (route.name === "demo") {
        await page.locator("#generate").click();
        await expect(page.locator(".field")).toHaveCount(17);
        await page.locator("#approve").check();
        await expect(page.locator("#export-docx")).toBeEnabled();
        await expectContrast(page, `demo ${width}px approved draft`);
        await page.locator(".trace-panel > summary").click();
        await page.locator("#edit-mode").check();
        await expect(page.locator("#edit-help")).toBeVisible();
        await expectContrast(page, `demo ${width}px editors and trace`);
      } else {
        await page.locator(".model-method > summary").click();
        await expect(page.locator(".model-method")).toHaveAttribute("open", "");
        await expectContrast(page, `story ${width}px expanded methodology`);
      }
      await expectNoPageOverflow(page);

      const helperSelector = route.name === "demo"
        ? ".small, .tiny-label, .fault-control p, .trace-panel summary span, footer"
        : ".story-boundary, .model-unit, .model-field label, .model-field p, .model-caveat, .story-caption, footer";
      await expectContrast(page, `${route.name} ${width}px small labels and helpers`, { selectors: helperSelector });
      const smallFonts = await page.locator(helperSelector).evaluateAll((elements) => elements
        .filter((element) => element.checkVisibility())
        .filter((element) => parseFloat(getComputedStyle(element).fontSize) < 12)
        .map((element) => element.className));
      expect(smallFonts, "Dark labels and disclosures must remain at least 12px on narrow screens").toEqual([]);

      await page.locator("#theme-toggle").click();
      await expectLightPalette(page);
      await expectNoPageOverflow(page);
      await page.locator("#theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expectContrast(page, `${route.name} ${width}px switched back`);
      await expectNoPageOverflow(page);
    });
  }
}

test("demo controls retain contrast through hover, keyboard focus, source failure and invalid edits", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?scoutTheme=dark");
  for (const selector of [".hero-actions .primary", "#generate", "#reset", "#theme-toggle", "#sample-select"]) {
    await expectContrast(page, `${selector} normal text`, { selectors: selector });
    await expectContrast(page, `${selector} normal boundary`, { kind: "border", selectors: selector });
    await page.locator(selector).hover();
    await expectContrast(page, `${selector} hover text`, { selectors: selector });
    await expectContrast(page, `${selector} hover boundary`, { kind: "border", selectors: selector });
    await expectKeyboardFocus(page, selector);
  }
  for (const selector of [".site-header nav a:first-child", ".hero-actions .text-link"]) {
    await page.locator(selector).hover();
    await expectContrast(page, `${selector} hover`, { selectors: selector });
    await expectKeyboardFocus(page, selector);
  }

  await expectContrast(page, "unchecked source checkbox", { kind: "border", selectors: "#retrieval-failure" });
  await page.locator("#retrieval-failure").check();
  await expectContrast(page, "checked source checkbox", { kind: "border", selectors: "#retrieval-failure" });
  await expectContrast(page, "source checkmark", { kind: "checkmark", selectors: "#retrieval-failure" });
  await expectKeyboardFocus(page, "#retrieval-failure");
  await page.locator("#generate").click();
  await expect(page.locator("#error")).toBeVisible();
  await expectContrast(page, "source failure text");
  await expectContrast(page, "source failure boundary", { kind: "border", selectors: "#error" });

  await page.locator("#retrieval-failure").uncheck();
  await page.locator("#generate").click();
  await page.locator("#edit-mode").check();
  const field = page.locator('[data-key="ActivityDescription"]');
  const summarySelector = '[data-key="ActivityDescription"] > summary';
  await expectKeyboardFocus(page, summarySelector);
  expect(await page.locator(summarySelector).evaluate((element) => parseFloat(getComputedStyle(element).outlineOffset))).toBeLessThanOrEqual(0);
  await expectKeyboardFocus(page, "#edit-ActivityDescription");
  await expectContrast(page, "editor boundary", { kind: "border", selectors: "#edit-ActivityDescription" });
  await field.locator("textarea").fill("");
  await field.locator(".editor-actions button").first().click();
  await expect(field.locator(".field-error")).toBeVisible();
  await expectContrast(page, "invalid editor text");
  await expectContrast(page, "invalid editor boundary", { kind: "border", selectors: "#edit-ActivityDescription" });
  await expectKeyboardFocus(page, "#edit-ActivityDescription");
  await field.locator(".editor-actions button").last().click();
  await field.locator("textarea").fill("A fictional revision for the contrast test.");
  await field.locator(".editor-actions button").first().click();
  await expectContrast(page, "edited field badge", { selectors: '[data-key="ActivityDescription"] .badge' });
  await page.locator("#approve").check();
  await expectContrast(page, "approval checkmark", { kind: "checkmark", selectors: "#approve" });
  for (const selector of ["#export-docx", "#export-json"]) {
    await expect(page.locator(selector)).toBeEnabled();
    await page.locator(selector).hover();
    await expectContrast(page, `${selector} enabled hover text`, { selectors: selector });
    await expectContrast(page, `${selector} enabled hover boundary`, { kind: "border", selectors: selector });
    await expectKeyboardFocus(page, selector);
  }
});

test("story controls and negative/error states remain distinguishable and readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/case-study.html?scoutTheme=dark");
  for (const selector of [".model-actions .primary", "#model-reset", "#assumption-manualMinutes"]) {
    await expectContrast(page, `${selector} normal text`, { selectors: selector });
    await expectContrast(page, `${selector} normal boundary`, { kind: "border", selectors: selector });
    await page.locator(selector).hover();
    await expectContrast(page, `${selector} hover text`, { selectors: selector });
    await expectContrast(page, `${selector} hover boundary`, { kind: "border", selectors: selector });
    await expectKeyboardFocus(page, selector);
  }
  for (const selector of [".story-toc a:first-child", "#decisions .table-scroll", ".model-method > summary"]) {
    await expectKeyboardFocus(page, selector);
  }
  await page.locator(".story-toc a:first-child").hover();
  await expectContrast(page, "story navigation hover", { selectors: ".story-toc a:first-child" });

  await page.locator("#assumption-successPercent").fill("0");
  await expect(page.locator("#result-net")).toHaveClass(/negative-value/);
  await expectContrast(page, "negative business model");
  const resultColor = await page.locator("#result-net").evaluate((element) => getComputedStyle(element).color);
  const danger = await page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--cp-danger").trim());
  expect(danger).toBe("#ff9696");
  expect(resultColor).toBe("rgb(255, 150, 150)");
  await page.locator("#assumption-manualMinutes").fill("0");
  await expect(page.locator("#model-error")).toBeVisible();
  await expect(page.locator("#model-results")).toBeHidden();
  await expectContrast(page, "invalid business assumptions text");
  await expectContrast(page, "invalid business assumptions boundaries", { kind: "border", selectors: '#model-error, .model-field input[aria-invalid="true"]' });
  await expectKeyboardFocus(page, "#assumption-manualMinutes");
});

for (const route of routes) {
  test(`${route.name}: system theme and explicit light selection keep the original light palette`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(route.path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(28, 34, 38)");
    await expect(page.locator("h1 span")).toHaveCSS("color", "rgb(243, 240, 232)");
    await page.goto(`${route.path}?scoutTheme=light`);
    await expectLightPalette(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(route.path);
    await expectLightPalette(page);
  });
}
