/**
 * Read-only check of /resume club discovery using the public Student demo.
 * Requires the normal seeded clubs, including HKN. Never sends requests or changes memberships.
 *
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-student-clubs.mjs
 * BASE_URL defaults to localhost:3100; reuse an installed Playwright and Chrome.
 */
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);

try {
  await page.goto(base);
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL(`${base}/resume`);

  const actionRequests = [];
  page.on("request", (request) => {
    if (request.method() === "POST") actionRequests.push(request.url());
  });

  const section = page.getByRole("region", { name: "Join another club", exact: true });
  const search = section.getByRole("searchbox", { name: /^Search clubs at / });
  const cards = section.getByRole("group", { name: "Clubs you can join", exact: true });
  const selected = section.getByRole("list", { name: "Selected clubs", exact: true });
  const consent = section.getByRole("checkbox", { name: /^Share my resume/ });
  await cards.getByRole("checkbox").nth(2).waitFor({ state: "attached" });
  assert.equal(await cards.getByRole("checkbox").count(), 3);
  assert.equal(await cards.getByRole("checkbox", { name: /HKN/ }).count(), 0, "HKN should be beyond the three suggestions in the seeded demo");

  await cards.locator("label").first().click();
  await consent.focus();
  await page.keyboard.press("Space");
  assert.ok(await consent.isChecked());

  await search.fill("  hKn  ");
  await cards.getByRole("checkbox", { name: /HKN/ }).waitFor({ state: "attached" });
  assert.equal(await cards.getByRole("checkbox").count(), 1);
  assert.equal(await selected.getByRole("button").count(), 1);
  assert.ok(await consent.isChecked(), "Searching must preserve consent and selections");
  await cards.locator("label").click();
  assert.equal(await selected.getByRole("button").count(), 2);
  assert.equal(await consent.isChecked(), false, "Adding another recipient needs fresh consent");

  await search.fill("engineering honor society");
  await cards.getByRole("checkbox", { name: /HKN/ }).waitFor({ state: "attached" });
  assert.ok(await cards.getByRole("checkbox", { name: /HKN/ }).isChecked());

  await search.fill("no-such-club-123456");
  await section.getByText("No clubs match your search. Try another name or description.", { exact: true }).waitFor();
  assert.equal(await cards.getByRole("checkbox").count(), 0);
  assert.equal(await selected.getByRole("button").count(), 2);
  assert.ok(await section.getByRole("button", { name: "Send 2 requests", exact: true }).isDisabled());
  await selected.getByRole("button", { name: "Remove HKN", exact: true }).click();
  assert.equal(await selected.getByRole("button").count(), 1);

  await search.fill("");
  await cards.getByRole("checkbox").nth(2).waitFor({ state: "attached" });
  assert.equal(await cards.getByRole("checkbox").count(), 3);
  assert.ok(await cards.getByRole("checkbox").first().isChecked());

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await search.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(await search.isVisible());
    assert.ok(await selected.getByRole("button").isVisible());
  }

  assert.deepEqual(actionRequests, [], "Search and selection must not submit server actions");
  console.log("PASS: three suggestions, name/description search, retained selections, consent, removal, empty state, and mobile widths; no submissions.");
} finally {
  await browser.close();
}
