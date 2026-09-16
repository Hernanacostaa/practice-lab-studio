import { expect } from "@playwright/test";

// Measure rendered styles, not isolated tokens. Alpha backgrounds are composited
// from the page canvas through every ancestor, including tinted progress states.
export async function measureContrast(page, { kind = "text", selectors } = {}) {
  return page.evaluate(({ kind, selectors }) => {
    const parse = (value) => {
      const channels = value.match(/^rgba?\((.+)\)$/)?.[1].split(/[, /]+/).map(Number);
      if (!channels || channels.length < 3 || channels.some(Number.isNaN)) {
        throw new Error(`Unsupported computed color: ${value}`);
      }
      return [...channels.slice(0, 3), channels[3] ?? 1];
    };
    const composite = (foreground, background) => [
      ...foreground.slice(0, 3).map((value, index) => value * foreground[3] + background[index] * (1 - foreground[3])),
      1,
    ];
    const backgroundAt = (element) => {
      const ancestors = [];
      for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
      return ancestors.reduce((background, node) => {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== "none" || Number(style.opacity) !== 1 || style.mixBlendMode !== "normal") {
          throw new Error("Contrast helper requires flat backgrounds without ancestor opacity or blending.");
        }
        return composite(parse(style.backgroundColor), background);
      }, [255, 255, 255, 1]);
    };
    const luminance = (color) => color.slice(0, 3)
      .map((value) => value / 255)
      .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const contrast = (foreground, background) => {
      const a = luminance(composite(foreground, background));
      const b = luminance(background);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const isRendered = (element) => element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      && element.getClientRects().length > 0
      && !element.closest(':disabled, [aria-disabled="true"], [aria-hidden="true"], option');
    const identify = (element) => element.id ? `#${element.id}`
      : `${element.tagName.toLowerCase()}${[...element.classList].map((name) => `.${name}`).join("")}`;
    const record = (element, foreground, background, part) => ({
      element: identify(element), part, foreground, background: background.slice(0, 3), ratio: contrast(parse(foreground), background),
    });
    let elements;
    if (selectors) {
      elements = [...document.querySelectorAll(selectors)].filter(isRendered);
    } else {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const parents = new Set();
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.trim() && isRendered(node.parentElement)) parents.add(node.parentElement);
      }
      document.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach((element) => {
        if (isRendered(element)) parents.add(element);
      });
      elements = [...parents];
    }
    return elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const inside = backgroundAt(element);
      if (kind === "text") return [record(element, style.color, inside, "text")];
      if (kind === "checkmark") {
        const marker = getComputedStyle(element, "::before");
        if (marker.content === "none" || parseFloat(marker.borderBottomWidth) < 2) throw new Error("Missing visible checkmark.");
        return [record(element, marker.borderBottomColor, inside, "checkmark")];
      }
      const outside = backgroundAt(element.parentElement);
      if (kind === "focus") {
        if (!element.matches(":focus-visible") || style.outlineStyle === "none" || parseFloat(style.outlineWidth) < 2) {
          throw new Error(`Missing keyboard focus indicator: ${identify(element)}`);
        }
        return [record(element, style.outlineColor, parseFloat(style.outlineOffset) < 0 ? inside : outside, "focus")];
      }
      if (kind !== "border") throw new Error(`Unknown measurement kind: ${kind}`);
      return ["Top", "Right", "Bottom", "Left"].flatMap((side) => {
        if (parseFloat(style[`border${side}Width`]) === 0 || style[`border${side}Style`] === "none") {
          throw new Error(`Missing control boundary: ${identify(element)} ${side}`);
        }
        return [
          record(element, style[`border${side}Color`], inside, `${side} border / inside`),
          record(element, style[`border${side}Color`], outside, `${side} border / outside`),
        ];
      });
    });
  }, { kind, selectors });
}

export async function expectContrast(page, label, options = {}) {
  const measurements = await measureContrast(page, options);
  const minimum = options.kind && options.kind !== "text" ? 3 : 4.5;
  expect(measurements.length, `${label}: audit must not be empty`).toBeGreaterThan(0);
  const failures = measurements.filter(({ ratio }) => ratio < minimum);
  expect(failures, `${label}: WCAG contrast must be at least ${minimum}:1`).toEqual([]);
  const worst = measurements.reduce((a, b) => a.ratio < b.ratio ? a : b);
  console.info(`${label}: ${measurements.length} measurements, minimum ${worst.ratio.toFixed(2)}:1 (${worst.element}, ${worst.part})`);
  return measurements;
}

export async function expectKeyboardFocus(page, selector) {
  await page.keyboard.press("Tab");
  await page.locator(selector).focus();
  await expect(page.locator(selector)).toBeFocused();
  await expectContrast(page, `Focus ${selector}`, { kind: "focus", selectors: selector });
}
