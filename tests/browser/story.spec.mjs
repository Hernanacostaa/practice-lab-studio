import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

test("the in-site story opens without losing an edited worksheet and preserves the theme", async ({ page }) => {
  await page.goto("/?scoutTheme=dark");
  await page.getByRole("button", { name: "Create sample draft" }).click();
  await page.locator("#edit-mode").check();
  const field = page.locator('[data-key="ActivityDescription"]');
  await field.locator("textarea").fill("A revised fictional workshop for portfolio review.");
  await field.getByRole("button", { name: "Apply field" }).click();
  await page.locator("#approve").check();
  const [story] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "Why I built this (opens in a new tab)", exact: true }).click(),
  ]);
  await expect(story).toHaveURL(/\/case-study\.html\?scoutTheme=dark$/);
  await expect(story.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(story.getByRole("heading", { level: 1 })).toHaveText("From source documentsto training exercises.");
  await expect(page.locator("#approve")).toBeChecked();
  await expect(field.locator("textarea")).toHaveValue("A revised fictional workshop for portfolio review.");
  await story.locator("#theme-toggle").click();
  await expect(story.locator("html")).toHaveAttribute("data-theme", "light");
  await story.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Try the workflow" }).click();
  await expect(story).toHaveURL(/\/index\.html\?scoutTheme=light#demo$/);
  await expect(story.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the real project progression stays distinct from replacement examples and modeled impact", async ({ page }) => {
  await page.goto("/case-study.html");
  await expect(page.locator(".story-boundary")).toContainText("Real project. Anonymized public version.");
  await expect(page.locator("#problem .story-caption")).toContainText("a real example from my work at Microsoft");
  await expect(page.locator("#problem-title")).toHaveText("Training authors were manually rebuilding source material into exercises.");
  await expect(page.locator(".approach-list h3")).toHaveText([
    "Identified the repeated authoring work",
    "Defined a consistent worksheet",
    "Built a working version",
    "Shared, presented, and demoed it",
    "Redesigned for production needs",
    "Created a public version people can explore",
  ]);
  await expect(page.locator(".model-disclosure")).toContainText("fictional planning numbers");
  await expect(page.locator(".metric-disclosure")).toContainText("not measured results");
});

test("calculator shows labeled illustrative economics and honestly handles negative scenarios", async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/case-study.html");
  await expect(page.locator("#calculator-unavailable")).toBeHidden();
  await expect(page.locator(".model-disclosure")).toContainText("Illustrative assumptions only");
  await expect(page.locator("#result-hours")).toHaveText("27.3 hours");
  await expect(page.locator("#result-gross")).toHaveText("$1,367");
  await expect(page.locator("#result-cost")).toHaveText("$280");
  await expect(page.locator("#result-net")).toHaveText("$1,087");
  await expect(page.locator("#result-break-even")).toHaveText("13 attempts / month");
  await expect(page.locator("#result-payback")).toHaveText("1.1 months (capacity-equivalent)");
  await page.getByLabel("Assisted completion rate", { exact: true }).fill("0");
  await expect(page.locator("#result-hours")).toHaveText("-26.7 hours");
  await expect(page.locator("#result-net")).toHaveClass(/negative-value/);
  await expect(page.locator("#result-payback")).toContainText("Not reached");
  await expect(page.locator("#model-interpretation")).toContainText("More volume alone cannot");
  await page.getByRole("button", { name: "Reset fictional assumptions" }).click();
  await expect(page.locator("#result-net")).toHaveText("$1,087");
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page).toHaveURL(/\/case-study\.html$/);
  expect(requests.filter((url) => !url.startsWith("http://127.0.0.1:4173/"))).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
});

test("invalid calculator inputs hide stale results and can be corrected", async ({ page }) => {
  await page.goto("/case-study.html");
  const baseline = page.getByLabel("Manual time per worksheet", { exact: true });
  await baseline.fill("0");
  await expect(page.locator("#model-error")).toBeVisible();
  await expect(baseline).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#model-results")).toBeHidden();
  await baseline.fill("");
  await expect(page.locator("#model-results")).toBeHidden();
  await baseline.fill("45");
  await expect(page.locator("#model-error")).toBeHidden();
  await expect(page.locator("#model-results")).toBeVisible();
  await page.getByLabel("Assisted attempts per month", { exact: true }).fill("0");
  await expect(page.locator("#result-hours")).toHaveText("0 hours");
  await expect(page.locator("#result-net")).toHaveText("-$200");
  await expect(page.locator("#result-payback")).toContainText("Not reached");
});

test("story and business model fit small screens and expose readable methodology", async ({ page }) => {
  for (const [width, theme] of [[320, "light"], [390, "dark"], [1440, "light"]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/case-study.html?scoutTheme=${theme}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".metric-disclosure")).toContainText("not measured results");
    await page.getByText("See the formulas and limits", { exact: true }).click();
    await expect(page.locator(".model-method")).toHaveAttribute("open", "");
    await expect(page.locator(".model-method")).toContainText("manual");
  }
});

test("the narrative remains readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/case-study.html");
    await expect(page.getByRole("heading", { name: "Measure accepted work, not generated words." })).toBeVisible();
    await expect(page.locator("#calculator-unavailable")).toBeVisible();
    await expect(page.locator("#calculator-unavailable")).toContainText("The calculator requires JavaScript");
    await expect(page.locator("#interactive-model")).toBeHidden();
    await expect(page.locator(".metric-disclosure")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("the standalone story and its link back to the demo work offline", async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(resolve("dist", "case-study.html")).href);
    await expect(page.locator("#result-hours")).toHaveText("27.3 hours");
    await page.getByRole("link", { name: "Try what I built" }).click();
    await page.getByRole("button", { name: "Create sample draft" }).click();
    await expect(page.locator(".field")).toHaveCount(17);
  } finally {
    await context.close();
  }
});
