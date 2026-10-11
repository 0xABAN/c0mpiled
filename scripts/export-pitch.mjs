/**
 * Export and check the two-slide deck, without starting or building the app.
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/export-pitch.mjs
 * Optional SHOT_DIR writes slide images outside the repository for visual review.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const deck = new URL("../docs/pitch/index.html", import.meta.url);
const pdf = new URL("roster-pitch.pdf", deck);
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(deck.href);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check("900 112px Nunito")), "The local deck font must load.");
  assert.equal(await page.locator(".slide").count(), 2);

  for (let index = 0; index < 2; index++) {
    if (index) await page.keyboard.press("ArrowRight");
    const slide = page.locator(".slide:not([hidden])");
    assert.equal(await slide.count(), 1);
    const clipped = await slide.locator("h1, h2, p, .audience, .outcome").evaluateAll((nodes) =>
      nodes.filter((node) => {
        const bounds = node.getBoundingClientRect();
        const slide = node.closest(".slide").getBoundingClientRect();
        return node.scrollWidth > node.clientWidth || bounds.bottom > slide.bottom || bounds.right > slide.right;
      }).map((node) => node.textContent));
    assert.deepEqual(clipped, [], "Slide text must not clip or overflow.");
    if (process.env.SHOT_DIR) {
      await mkdir(process.env.SHOT_DIR, { recursive: true });
      await slide.screenshot({ path: `${process.env.SHOT_DIR}/slide-${index + 1}.png` });
    }
  }
  await page.keyboard.press("ArrowLeft");
  assert.ok(await page.getByRole("heading", { name: "Hire students. Fund their clubs." }).isVisible());
  await page.pdf({ path: fileURLToPath(pdf), preferCSSPageSize: true, printBackground: true });
} finally {
  await browser.close();
}

const mupdf = await import("mupdf");
const pdfDocument = mupdf.Document.openDocument(await readFile(pdf), "application/pdf");
try {
  assert.equal(pdfDocument.countPages(), 2, "The exported deck must have exactly two slides.");
  for (const [index, expected] of [[0, "Hire students."], [1, "95% to the club."]]) {
    const page = pdfDocument.loadPage(index);
    const text = page.toStructuredText("");
    try {
      assert.ok(text.asText().includes(expected), `Missing slide ${index + 1} text.`);
      const [left, top, right, bottom] = page.getBounds();
      assert.ok(Math.abs((right - left) / (bottom - top) - 16 / 9) < 0.01, "Slides must be widescreen.");
    } finally {
      text.destroy();
      page.destroy();
    }
  }
} finally {
  pdfDocument.destroy();
}
console.log(`PASS: two unclipped widescreen slides, local font, keyboard navigation, and PDF text. Exported ${fileURLToPath(pdf)}`);
