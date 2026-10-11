/**
 * Read-only navigation smoke test against a running app with the public demos enabled.
 * No uploads, purchases, membership changes, or saved edits.
 *
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-navigation.mjs
 * BASE_URL defaults to localhost:3100; reuses an installed browser and Playwright.
 */
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);

async function expectHome() {
  await page.waitForURL(`${base}/`);
  await page.getByRole("heading", { name: /Every club's resume book/ }).waitFor();
}

try {
  await page.goto(base);
  await page.getByRole("button", { name: "Company", exact: true }).click();
  await page.waitForURL(`${base}/browse`);
  await page.goBack();
  await expectHome();
  await page.goForward();
  await page.waitForURL(`${base}/browse`);
  await page.getByRole("link", { name: "Roster home", exact: true }).click();
  await expectHome();
  console.log("PASS company demo: logo and browser back/forward reach the homepage.");

  await page.getByRole("link", { name: "Browse", exact: true }).click();
  await page.getByRole("button", { name: /^Class of 2028,/ }).click();
  await page.waitForURL(`${base}/browse?year=2028`);
  await page.getByRole("region", { name: "Resumes", exact: true }).locator('a[href*="r="]').first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const resumeUrl = page.url();
  await dialog.locator('a[href^="/unlock/"]:visible').first().click();
  await page.waitForURL(url => url.pathname.startsWith("/unlock/"));
  assert.equal(new URL(page.url()).searchParams.get("year"), "2028");
  await page.getByRole("link", { name: "Back to resume", exact: true }).click();
  await page.waitForURL(resumeUrl);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await page.waitForURL(`${base}/browse?year=2028`);
  console.log("PASS checkout return: candidate and filters survive; close returns to filtered results.");

  await page.getByRole("link", { name: "Roster home", exact: true }).click();
  await expectHome();
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL(`${base}/resume`);
  await page.getByRole("link", { name: "Roster home", exact: true }).click();
  await expectHome();
  console.log("PASS student demo: account switch and logo return work.");
} finally {
  await browser.close();
}
