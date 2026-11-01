import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import { expectContrast, expectKeyboardFocus } from "./theme-contrast.mjs";

test("the homepage explains Hernan's work and decodes every self-contained photo", async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Hernan Acosta/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("I\u2019m Hernan! :D");
  await expect(page.locator(".hero-hook")).toContainText("I build AI tools.");
  await expect(page.locator(".portrait")).toContainText("IT Technical Trainer");
  await expect(page.locator(".company-list img")).toHaveCount(3);
  expect(await page.locator(".company-list img").evaluateAll((images) => images.map((image) => image.alt))).toEqual(["Microsoft", "PayPal", "Amazon"]);
  await expect(page.getByRole("img", { name: "Hernan Acosta, professional portrait", exact: true })).toBeVisible();
  for (const id of ["work", "microsoft", "about", "community", "life", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.locator("#work > .feature-footnote")).toHaveCount(0);
  await expect(page.locator(".feature-description")).toHaveText("I built a tool that uses AI to turn training-needs assessments and operating procedures into a guide for datacenter trainers.");
  await expect(page.locator(".print-profile .project-classification")).toContainText("AI-assisted document generation and workflow automation.");
  expect(await page.locator("main img").count()).toBe(11);
  await page.locator("main img").evaluateAll(async (images) => {
    images.forEach((image) => { image.loading = "eager"; });
    await Promise.all(images.map((image) => image.decode()));
  });
  expect(await page.locator("main img").evaluateAll((images) => images.every((image) => image.naturalWidth > 0 && image.src.startsWith("data:image/")))).toBe(true);
  expect(requests).toEqual(["http://127.0.0.1:4173/"]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage)])).toEqual([[], []]);
  expect((await stat(resolve("dist", "index.html"))).size).toBeLessThan(1_500_000);
});

test("homepage omits the removed supporting blocks and captions without removing photos or contact links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".feature-path, .community-portrait figcaption, .gallery-hint, .footer-note")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Real project. Public adaptation.");
  await expect(page.locator("#life")).not.toContainText("Mountains, a very necessary rain poncho");
  await expect(page.locator("#contact")).not.toContainText("I’m interested in product opportunities");
  await expect(page.locator("#photo-gallery")).toBeAttached();
  await expect(page.locator(".community-portrait img")).toBeAttached();
  await expect(page.locator("#contact").getByRole("link", { name: /Connect on LinkedIn/ })).toBeAttached();
});

test("project routes retain the chosen theme and the actual review-and-export experience", async ({ page }) => {
  await page.goto("/?scoutTheme=light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".feature-actions a").first()).toHaveAttribute("href", /lab\.html\?scoutTheme=dark$/);
  await page.locator(".feature-actions").getByRole("link", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/lab\.html\?scoutTheme=dark#demo$/);
  await page.getByRole("button", { name: "Create prepared trainer guide" }).click();
  await expect(page.locator(".field")).toHaveCount(17);
  await expect(page.getByRole("button", { name: "Download Word" })).toBeDisabled();
  await page.locator("#approve").check();
  await expect(page.getByRole("button", { name: "Download Word" })).toBeEnabled();
  const [portfolio] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: /About Hernan/ }).first().click(),
  ]);
  await expect(portfolio).toHaveURL(/index\.html\?scoutTheme=dark$/);
  await expect(page.locator("#approve")).toBeChecked();
  await expect(portfolio.getByRole("heading", { level: 1 })).toHaveText("I\u2019m Hernan! :D");
});

test("old root demo bookmarks still open the demo with their query and fragment", async ({ page }) => {
  for (const path of ["/?scoutTheme=dark#demo", "/index.html?scoutTheme=light#demo", "/#design"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/lab\\.html${path.includes("?") ? "\\?scoutTheme=" + (path.includes("dark") ? "dark" : "light") : ""}${path.endsWith("#design") ? "#design" : "#demo"}$`));
    await expect(page.getByRole("button", { name: "Create prepared trainer guide" })).toBeAttached();
  }
});

test("manual photo carousel supports buttons, keyboard, natural scroll and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const track = page.locator("#gallery-track");
  await track.scrollIntoViewIfNeeded();
  const previous = page.getByRole("button", { name: "Previous photo", exact: true });
  const next = page.getByRole("button", { name: "Next photo", exact: true });
  await expect(previous).toBeDisabled();
  await expect(page.locator("#gallery-position")).toHaveText("01 / 05");
  await next.click();
  await expect(page.locator("#gallery-position")).toHaveText("02 / 05");
  await expect(page.locator("#gallery-status")).toContainText("Photo 2 of 5");
  await expect(page.locator(".gallery-dot[aria-pressed=true]")).toHaveCount(1);
  await track.focus();
  await page.keyboard.press("End");
  await expect(page.locator("#gallery-position")).toHaveText("05 / 05");
  await expect(next).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#gallery-position")).toHaveText("04 / 05");
  await page.keyboard.press("Home");
  await expect(previous).toBeDisabled();
  await page.getByRole("button", { name: "Show photo 3: A change of scenery", exact: true }).click();
  await expect(page.locator("#gallery-position")).toHaveText("03 / 05");
  await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: "instant" }));
  await expect(page.locator("#gallery-position")).toHaveText("05 / 05");
  expect(await page.locator("html").evaluate((element) => getComputedStyle(element).scrollBehavior)).toBe("auto");
});

test("Microsoft stories expand independently with useful contribution and judgment detail", async ({ page }) => {
  await page.goto("/#microsoft");
  const details = page.locator(".work-card details");
  await expect(details).toHaveCount(3);
  await details.nth(0).locator("summary").click();
  await expect(details.nth(0)).toHaveAttribute("open", "");
  await expect(details.nth(0).locator(".work-detail")).toContainText("My contribution");
  await details.nth(1).locator("summary").click();
  await expect(details.nth(0)).toHaveAttribute("open", "");
  await expect(details.nth(1)).toHaveAttribute("open", "");
  await expect(details.nth(2)).not.toHaveAttribute("open", "");
});

test("homepage reflows from 320 to 1440 CSS pixels in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?scoutTheme=${theme}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("I\u2019m Hernan! :D");
      await expect(page.getByRole("navigation", { name: "Main navigation", exact: true })).toBeVisible();
    }
  }
});

test("dark mode is the default even on a light system and both theme overrides remain explicit", async ({ page }) => {
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/?scoutTheme=invalid");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/?scoutTheme=light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
});

test("homepage text and keyboard controls retain accessible contrast in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto(`/?scoutTheme=${theme}`);
    await page.locator(".work-card details").evaluateAll((elements) => elements.forEach((element) => { element.open = true; }));
    await expectContrast(page, `Portfolio ${theme} text`);
    await expectContrast(page, `Portfolio ${theme} photo controls`, { kind: "border", selectors: "#gallery-next" });
    for (const selector of [".skip-link", "#theme-toggle", ".feature-actions a:first-child", ".work-card summary", "#gallery-track", "#gallery-next", "#print-profile"]) {
      await expectKeyboardFocus(page, selector === ".work-card summary" ? ".work-card:first-child summary" : selector);
    }
  }
});

test("the story, contact and native photo gallery remain usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#theme-toggle")).toBeHidden();
    await expect(page.locator("#gallery-controls")).toBeHidden();
    await expect(page.locator("#print-profile")).toBeHidden();
    await expect(page.locator("#contact a").first()).toHaveAttribute("href", "https://www.linkedin.com/in/hernanacostajr/");
    await page.locator(".work-card summary").first().click();
    await expect(page.locator(".work-detail").first()).toBeVisible();
    await expect(page.locator(".gallery-slide")).toHaveCount(5);
    expect(await page.locator("#gallery-track").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  } finally {
    await context.close();
  }
});

test("offline homepage still shows portraits, links to the lab, and offers an honest one-page profile", async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(resolve("dist", "index.html")).href + "?scoutTheme=dark");
    await page.locator(".portrait img").evaluate((image) => image.decode());
    expect(await page.locator(".portrait img").evaluate((image) => image.naturalWidth)).toBe(800);
    await page.evaluate(() => {
      window.print = () => { document.documentElement.dataset.printRequested = "true"; };
    });
    await page.getByRole("button", { name: "Print or save a one-page profile" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-print-requested", "true");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".print-profile")).toBeVisible();
    await expect(page.locator(".print-profile")).toContainText("IT Technical Trainer");
    await expect(page.locator(".print-profile")).toContainText("Arizona State University");
    await expect(page.locator("main")).toBeHidden();
    const printColors = await page.locator(".print-profile").evaluate((element) => ({
      text: getComputedStyle(element).color,
      background: getComputedStyle(document.body).backgroundColor,
    }));
    expect(printColors.text).toBe("rgb(36, 36, 36)");
    expect(printColors.background).toBe("rgb(255, 255, 255)");
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true });
    const pageCounts = [...pdf.toString("latin1").matchAll(/\/Type\s*\/Pages\b[\s\S]{0,200}?\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
    expect(pageCounts).toEqual([1]);
    await page.emulateMedia({ media: "screen" });
    await page.locator(".feature-actions").getByRole("link", { name: "Try the demo" }).click();
    await page.getByRole("button", { name: "Create prepared trainer guide" }).click();
    await expect(page.locator(".field")).toHaveCount(17);
  } finally {
    await context.close();
  }
});
