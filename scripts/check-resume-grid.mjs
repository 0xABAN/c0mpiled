// Read-only layout check against a running app with the public student demo enabled.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-resume-grid.mjs
// Optional: BASE_URL (default :3100), SHOT_DIR (screenshots outside the repo).
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  const base = process.env.BASE_URL ?? "http://localhost:3100";
  await page.goto(base);
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL("**/resume");
  await page.goto(`${base}/browse`);
  const cards = page.getByRole("region", { name: "Resumes", exact: true }).locator('a[href*="r="]');
  await cards.first().waitFor();
  await page.evaluate(() => document.fonts.ready);

  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const measurements = await cards.evaluateAll((elements) => elements.map((card) => {
      const rect = card.getBoundingClientRect();
      const thumbnail = card.querySelector("article");
      const paper = thumbnail.parentElement;
      const footer = paper.parentElement.nextElementSibling;
      return {
        top: Math.round(rect.top),
        height: rect.height,
        footerOffset: footer.getBoundingClientRect().top - rect.top,
        whitespace: paper.clientHeight - thumbnail.getBoundingClientRect().height,
      };
    }));

    assert.ok(measurements.length > 3, "Need varied sample resumes to check alignment.");
    assert.ok(Math.max(...measurements.map((card) => card.height)) - Math.min(...measurements.map((card) => card.height)) < 1, "Every card must have the same height.");
    assert.ok(Math.max(...measurements.map((card) => card.footerOffset)) - Math.min(...measurements.map((card) => card.footerOffset)) < 1, "All card footers must line up.");
    assert.ok(measurements.every((card) => card.whitespace >= -1), "Do not crop thumbnail content to force a fixed height.");
    assert.ok(measurements.some((card) => card.whitespace > 20), "Short resumes should have whitespace at the bottom.");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal page overflow.");

    const rows = [...new Set(measurements.map((card) => card.top))];
    const rowGaps = rows.slice(1).map((top, index) => top - rows[index]);
    assert.ok(Math.max(...rowGaps) - Math.min(...rowGaps) <= 1, "Rows must be evenly spaced, not masonry columns.");
    if (process.env.SHOT_DIR) {
      await mkdir(process.env.SHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.SHOT_DIR, `grid-${width}.png`) });
    }
    console.log(`PASS ${width}px: equal cards and footers, aligned rows, whitespace without cropping`);
  }
} finally {
  await browser.close();
}
