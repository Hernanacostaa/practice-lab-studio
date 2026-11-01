import { test, expect } from "@playwright/test";
import { expectContrast, expectKeyboardFocus } from "./theme-contrast.mjs";

const routes = [
  { name: "demo", path: "/lab.html" },
  { name: "story", path: "/case-study.html" },
];

const palettes = {
  light: {
    "--cp-bg": "#f7eddb",
    "--cp-bg-elevated": "#fff7e9",
    "--cp-surface": "#fffcf4",
    "--cp-text": "#2b2721",
    "--cp-accent": "#943d29",
    "--cp-accent-hover": "#762d1d",
    "--cp-accent-fg": "#fff7e9",
    "--cp-border-strong": "#8a7057",
    "--cp-danger": "#dc2626",
  },
  dark: {
    "--cp-bg": "#14232b",
    "--cp-bg-elevated": "#1b3039",
    "--cp-surface": "#233941",
    "--cp-text": "#fff0d8",
    "--cp-accent": "#ffc65c",
    "--cp-accent-hover": "#ffdb8f",
    "--cp-accent-fg": "#15252c",
    "--cp-border-strong": "#97a19a",
    "--cp-danger": "#f87171",
  },
};

const rgb = (hex) => `rgb(${hex.slice(1).match(/../g).map((value) => parseInt(value, 16)).join(", ")})`;

async function expectNoPageOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function expectPalette(page, theme) {
  const expected = palettes[theme];
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  expect(await page.locator("html").evaluate((element, keys) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(keys.map((key) => [key, style.getPropertyValue(key).trim()]));
  }, Object.keys(expected))).toEqual(expected);
  await expect(page.locator("body")).toHaveCSS("background-color", rgb(expected["--cp-bg"]));
  await expect(page.locator("body")).toHaveCSS("color", rgb(expected["--cp-text"]));
  const primary = page.locator(".button.primary").first();
  await expect(primary).toHaveCSS("background-color", rgb(expected["--cp-accent"]));
  await expect(primary).toHaveCSS("color", rgb(expected["--cp-accent-fg"]));
  await expect(page.locator("h1").first()).toHaveCSS("font-family", 'Georgia, "Times New Roman", serif');
  await expect(page.locator("h2").first()).toHaveCSS("font-family", 'Georgia, "Times New Roman", serif');
}

async function expectWorksheetPreview(page) {
  const preview = page.locator("#worksheet-preview");
  await expect(preview).toBeVisible();
  await expect(preview.locator("[data-preview-key]")).toHaveCount(17);
  await expect(preview).toHaveCSS("background-color", rgb("#f8ecd7"));
  await expect(preview).toHaveCSS("color", rgb("#1b2b34"));
  await expect(page.locator("#fields")).toBeHidden();
}

for (const width of [320, 390, 1440]) {
  for (const route of routes) {
    test(`${route.name}: dark text, helper labels, responsive layout and theme switching at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await page.goto(`${route.path}?scoutTheme=dark`);
      await expectPalette(page, "dark");
      await expectNoPageOverflow(page);
      const initial = await expectContrast(page, `${route.name} ${width}px initial`);
      expect(initial.length).toBeGreaterThan(50);

      if (route.name === "demo") {
        await page.locator("#generate").click();
        await expect(page.locator(".field")).toHaveCount(17);
        await expectWorksheetPreview(page);
        await page.locator("#full-guide > summary").click();
        await page.locator(".worksheet-meta > summary").click();
        await page.locator("#source-assessment > summary").click();
        await page.locator("#source-sop > summary").click();
        await expectContrast(page, `demo ${width}px readable worksheet and expanded source tools`);
        await page.locator("#approve").check();
        await expect(page.locator("#export-docx")).toBeEnabled();
        await expectContrast(page, `demo ${width}px approved draft`);
        await page.locator(".trace-panel > summary").click();
        await page.locator("#edit-mode").check();
        await expect(page.locator("#edit-help")).toBeVisible();
        await expect(page.locator("#fields")).toBeVisible();
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
      await expectPalette(page, "light");
      await expectNoPageOverflow(page);
      await page.locator("#theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expectContrast(page, `${route.name} ${width}px switched back`);
      await expectNoPageOverflow(page);
    });
  }
}

for (const theme of ["dark", "light"]) {
  test(`demo controls retain contrast through hover, keyboard focus, source failure and invalid edits (${theme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/lab.html?scoutTheme=${theme}`);
    for (const [selector, kind] of [
      ["#generate", "surface"],
      ["#reset", "border"],
      ["#theme-toggle", "border"],
    ]) {
      await expectContrast(page, `${selector} normal text`, { selectors: selector });
      await expectContrast(page, `${selector} normal boundary`, { kind, selectors: selector });
      await page.locator(selector).hover();
      await expectContrast(page, `${selector} hover text`, { selectors: selector });
      await expectContrast(page, `${selector} hover boundary`, { kind, selectors: selector });
      await expectKeyboardFocus(page, selector);
    }
    for (const selector of [".site-header nav a:first-child", ".case-pane .text-link", "#source-assessment > summary", "#source-sop > summary", ".trace-panel > summary"]) {
      await page.locator(selector).hover();
      await expectContrast(page, `${selector} hover`, { selectors: selector });
      await expectKeyboardFocus(page, selector);
    }

    await page.locator("#source-assessment > summary").click();
    await page.locator(".trace-panel > summary").click();
    await expectContrast(page, "unchecked source checkbox", { kind: "border", selectors: "#retrieval-failure" });
    await page.locator("#retrieval-failure").check();
    await expectContrast(page, "checked source checkbox", { kind: "surface", selectors: "#retrieval-failure" });
    await expectContrast(page, "source checkmark", { kind: "checkmark", selectors: "#retrieval-failure" });
    await expectKeyboardFocus(page, "#retrieval-failure");
    await page.locator("#generate").click();
    await expect(page.locator("#error")).toBeVisible();
    await expectContrast(page, "source failure text");
    await expectContrast(page, "source failure boundary", { kind: "border", selectors: "#error" });

    await page.locator("#retrieval-failure").uncheck();
    await page.locator("#generate").click();
    await expectWorksheetPreview(page);
    await page.locator("#full-guide > summary").click();
    await page.locator(".worksheet-meta > summary").click();
    await expectKeyboardFocus(page, ".worksheet-meta > summary");
    await expectContrast(page, "readable worksheet, title-page details and source guide");
    await page.locator("#edit-mode").check();
    await expect(page.locator("#fields")).toBeVisible();
    await expectContrast(page, "checked edit-mode checkbox", { kind: "surface", selectors: "#edit-mode" });
    await expectContrast(page, "edit-mode checkmark", { kind: "checkmark", selectors: "#edit-mode" });
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
    await expectContrast(page, "checked approval checkbox", { kind: "surface", selectors: "#approve" });
    await expectContrast(page, "approval checkmark", { kind: "checkmark", selectors: "#approve" });
    for (const [selector, kind] of [["#export-docx", "surface"], ["#export-json", "border"]]) {
      await expect(page.locator(selector)).toBeEnabled();
      await page.locator(selector).hover();
      await expectContrast(page, `${selector} enabled hover text`, { selectors: selector });
      await expectContrast(page, `${selector} enabled hover boundary`, { kind, selectors: selector });
      await expectKeyboardFocus(page, selector);
    }
  });

  test(`story controls and negative/error states remain distinguishable and readable (${theme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/case-study.html?scoutTheme=${theme}`);
    for (const [selector, kind] of [
      [".model-actions .primary", "surface"],
      ["#model-reset", "border"],
      ["#assumption-manualMinutes", "border"],
    ]) {
      await expectContrast(page, `${selector} normal text`, { selectors: selector });
      await expectContrast(page, `${selector} normal boundary`, { kind, selectors: selector });
      await page.locator(selector).hover();
      await expectContrast(page, `${selector} hover text`, { selectors: selector });
      await expectContrast(page, `${selector} hover boundary`, { kind, selectors: selector });
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
    expect(danger).toBe(palettes[theme]["--cp-danger"]);
    expect(resultColor).toBe(rgb(palettes[theme]["--cp-danger"]));
    await page.locator("#assumption-manualMinutes").fill("0");
    await expect(page.locator("#model-error")).toBeVisible();
    await expect(page.locator("#model-results")).toBeHidden();
    await expectContrast(page, "invalid business assumptions text");
    await expectContrast(page, "invalid business assumptions boundaries", { kind: "border", selectors: '#model-error, .model-field input[aria-invalid="true"]' });
    await expectKeyboardFocus(page, "#assumption-manualMinutes");
  });
}

for (const route of [{ name: "portfolio", path: "/" }, ...routes]) {
  test(`${route.name}: the shared palette defaults to dark regardless of system preference and honors explicit overrides`, async ({ page }) => {
    for (const colorScheme of ["dark", "light"]) {
      await page.emulateMedia({ colorScheme });
      await page.goto(route.path);
      await expectPalette(page, "dark");
      await page.goto(`${route.path}?scoutTheme=invalid`);
      await expectPalette(page, "dark");
      await page.goto(`${route.path}?scoutTheme=light`);
      await expectPalette(page, "light");
      await page.goto(`${route.path}?scoutTheme=dark`);
      await expectPalette(page, "dark");
    }
  });
}
