/** Read-only real quotes/history: never creates a purchase, saves a price, or resets demo data. */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch();

function cents(text) {
  const value = Math.round(Number(text.replace(/[+$,]/g, "")) * 100);
  assert.ok(Number.isSafeInteger(value), `Invalid displayed amount: ${text}`);
  return value;
}

async function checkSummary(page) {
  const summary = page.getByRole("complementary", { name: "Order summary" });
  const gross = cents(await summary.locator(".tabular").first().innerText());
  const fee = cents(await summary.getByText("Roster fee (5%)", { exact: true }).locator("..").locator(".tabular").innerText());
  const club = cents(await summary.getByText(/^\s*To /).locator("..").locator(".tabular").innerText());
  const total = cents(await summary.getByText("Total today", { exact: true }).locator("..").locator(".tabular").innerText());
  assert.equal(fee, Math.round(gross * 0.05));
  assert.equal(club + fee, gross);
  assert.equal(total, gross, "The platform fee must not surcharge the buyer.");
  assert.ok(await summary.getByText("Included in the book price.", { exact: true }).isVisible());
  assert.ok(await summary.getByText("Test mode: you won't be charged.", { exact: true }).isVisible());
  return summary;
}

try {
  const company = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await company.goto(base);
  await company.getByRole("button", { name: "Company", exact: true }).click();
  await company.waitForURL(`${base}/browse`);
  const cards = company.locator('a[href*="r="]');
  await cards.first().waitFor();
  const candidates = await cards.evaluateAll((links) => links
    .filter((link) => link.parentElement.textContent.includes("Locked"))
    .map((link) => ({ href: link.href, multiple: /\+\d+/.test(link.parentElement.textContent) })));

  for (const multiple of [false, true]) {
    const candidate = candidates.find((item) => item.multiple === multiple);
    assert.ok(candidate, "The shared demo needs a locked single- and multi-book candidate; do not reset data to repair this test.");
    const resumeId = new URL(candidate.href).searchParams.get("r");
    await company.goto(`${base}/unlock/${resumeId}`, { waitUntil: "networkidle" });
    await checkSummary(company);
    for (const offer of await company.locator('label:has(input[name="book"])').all()) {
      await offer.click();
      await checkSummary(company);
    }
    for (const width of [390, 320]) {
      await company.setViewportSize({ width, height: 900 });
      const summary = await checkSummary(company);
      await summary.scrollIntoViewIfNeeded();
      const bounds = await summary.boundingBox();
      assert.ok(bounds.width <= width, "Fee summary must fit mobile widths.");
      if (process.env.SHOT_DIR) {
        await mkdir(process.env.SHOT_DIR, { recursive: true });
        await company.screenshot({ path: `${process.env.SHOT_DIR}/fee-${multiple ? "multi" : "single"}-${width}.png` });
      }
    }
    await company.setViewportSize({ width: 1280, height: 900 });
  }

  const student = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await student.goto(base);
  await student.getByRole("button", { name: "Student", exact: true }).click();
  await student.waitForURL(`${base}/resume`);
  await student.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
  const earnings = student.getByRole("region", { name: "Earnings", exact: true });
  const total = cents(await earnings.locator(".tabular").first().innerText());
  const amounts = await earnings.locator("li .tabular").allInnerTexts();
  assert.equal(amounts.reduce((sum, amount) => sum + cents(amount), 0), total);
  if (process.env.EXPECTED_HISTORICAL_EARNED_CENTS) {
    assert.equal(total, Number(process.env.EXPECTED_HISTORICAL_EARNED_CENTS), "Previously recorded club earnings must not be reduced.");
  }
  assert.ok(await earnings.getByText(/after Roster fees/).isVisible());
  const price = student.getByRole("region", { name: "Book price", exact: true });
  const disclosure = price.getByText("Your club keeps 95% of each new sale, before processing costs.", { exact: true });
  assert.ok(await disclosure.isVisible());
  await price.getByRole("button", { name: "Edit", exact: true }).click();
  assert.ok(await disclosure.isVisible());
  await price.getByRole("button", { name: "Cancel", exact: true }).click();
  console.log(`PASS: real single/multi-book 5% quotes, no buyer surcharge, mobile summary, fee disclosure, and unchanged historical earnings (${total} cents). No purchases or saves.`);
} finally {
  await browser.close();
}
