/**
 * Read-only color check using the landing examples, signup choices, and public Company demo.
 * Requires seeded single- and multi-book candidates; never buys a book or creates an account.
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-ui-colors.mjs
 */
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);

const badgeColors = {
  Internship: { background: "rgb(255, 77, 0)", color: "rgb(255, 255, 255)" },
  "Full-time": { background: "rgb(246, 180, 0)", color: "rgb(255, 255, 255)" },
  "Intern + Full-time": { background: "rgb(235, 235, 235)", color: "rgb(38, 38, 38)" },
};

async function checkBadges(root) {
  const badges = root.locator("span[data-tone]").filter({ hasText: /^(Internship|Full-time|Intern \+ Full-time)$/ });
  assert.ok(await badges.count() > 0, "Expected an employment badge");
  for (const badge of await badges.all()) {
    const label = await badge.textContent();
    assert.deepEqual(await badge.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
    })), badgeColors[label], `Wrong employment colors for ${label}`);
  }
}

async function checkSelected(card) {
  // Selection colors transition; wait for the final face rather than an intermediate frame.
  await page.waitForFunction((node) => getComputedStyle(node).backgroundColor === "rgb(255, 77, 0)", await card.elementHandle());
  assert.equal(await card.evaluate((node) => getComputedStyle(node).borderBottomColor), "rgb(199, 60, 0)");
}

try {
  await page.goto(base, { waitUntil: "networkidle" });
  for (const label of Object.keys(badgeColors)) {
    assert.ok(await page.getByText(label, { exact: true }).count() > 0, `Landing example missing: ${label}`);
  }
  await checkBadges(page);

  await page.goto(`${base}/signup`, { waitUntil: "networkidle" });
  const student = page.getByRole("radio", { name: /I'm a student/ });
  const company = page.getByRole("radio", { name: /I'm hiring/ });
  await student.locator("..").click();
  await checkSelected(student.locator(".."));
  assert.equal(await student.locator("..").getByText(/Join your club/).evaluate((node) => getComputedStyle(node).color), "rgb(38, 38, 38)");
  await page.mouse.move(0, 0);
  await company.focus();
  await page.keyboard.press("Space");
  await checkSelected(company.locator(".."));
  assert.equal(await student.isChecked(), false);
  await page.waitForFunction((node) => getComputedStyle(node).backgroundColor === "rgb(255, 255, 255)", await student.locator("..").elementHandle());

  await page.goto(base);
  await page.getByRole("button", { name: "Company", exact: true }).click();
  await page.waitForURL(`${base}/browse`);
  const cards = page.locator('a[href*="r="]');
  await cards.first().waitFor();
  await checkBadges(page);

  const candidates = await cards.evaluateAll((links) => links
    .filter((link) => link.parentElement.textContent.includes("Locked"))
    .map((link) => ({ href: link.href, multipleBooks: /\+\d+/.test(link.parentElement.textContent) })));

  for (const multipleBooks of [true, false]) {
    const candidate = candidates.find((item) => item.multipleBooks === multipleBooks);
    assert.ok(candidate, `Seeded demo needs a locked ${multipleBooks ? "multi" : "single"}-book candidate`);
    await page.goto(candidate.href, { waitUntil: "networkidle" });
    const sidebar = page.getByRole("dialog").getByRole("complementary");
    await checkBadges(sidebar);
    await sidebar.getByRole("link", { name: "Buy resume book", exact: true }).click();
    await page.waitForURL(/\/unlock\//);
    await checkBadges(page);

    const selected = multipleBooks
      ? page.locator('label:has(input[name="book"]:checked)')
      : page.getByRole("heading", { name: "The book", exact: true }).locator("..").locator(":scope > div");
    await checkSelected(selected);

    if (multipleBooks) {
      await page.locator('label:has(input[name="book"]:not(:checked))').first().click();
      await checkSelected(selected);
      assert.equal(await page.locator('input[name="book"]:checked').count(), 1);
    }

    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await checkSelected(selected);
    }
  }

  console.log("PASS: orange/yellow/gray badges, solid selected radios, keyboard selection, single/multi-book checkout, and colors at mobile widths; no purchases.");
} finally {
  await browser.close();
}
