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

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(await page.getByRole("searchbox", { name: "Search resumes" }).isVisible());
  }

  await page.getByRole("link", { name: "Roster home", exact: true }).click();
  await expectHome();
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL(`${base}/resume`);
  await page.getByRole("link", { name: "Roster home", exact: true }).click();
  await expectHome();
  console.log("PASS student demo: account switch and logo return work.");

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/resume", "/dashboard", "/browse"]) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    }
  }
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Browse", exact: true }).click();
  await page.waitForURL(`${base}/browse`);
  console.log("PASS mobile: student pages and company header fit 320/390px; account menu exposes Browse.");

  await page.goto(`${base}/dashboard`);
  const price = page.getByRole("region", { name: "Book price", exact: true });
  await price.getByRole("button", { name: "Edit", exact: true }).click();
  const savedPrice = await price.getByRole("textbox", { name: "Price in dollars" }).inputValue();
  await price.getByRole("textbox", { name: "Price in dollars" }).fill("425");
  await price.getByRole("button", { name: "Cancel", exact: true }).click();
  await price.getByRole("button", { name: "Edit", exact: true }).click();
  assert.equal(await price.getByRole("textbox", { name: "Price in dollars" }).inputValue(), savedPrice);
  await price.getByRole("button", { name: "Cancel", exact: true }).click();
  console.log("PASS price editor: Cancel discards the draft without changing the saved price.");

  const signup = await browser.newPage();
  await signup.goto(`${base}/signup`);
  await signup.locator("label").filter({ has: signup.getByRole("radio", { name: /I'm a student/ }) }).click();
  await signup.getByRole("button", { name: "Continue", exact: true }).click();
  await signup.getByRole("textbox", { name: "School name" }).fill("Pennsylvania State");
  await signup.getByText("Pennsylvania State University", { exact: true }).click();
  await signup.getByRole("button", { name: "Continue", exact: true }).click();
  await signup.getByRole("heading", { name: "Create your account" }).waitFor();
  await signup.getByRole("button", { name: "Back", exact: true }).click();
  await signup.getByRole("button", { name: "Back", exact: true }).click();
  await signup.locator("label").filter({ has: signup.getByRole("radio", { name: /I'm hiring/ }) }).click();
  await signup.getByRole("button", { name: "Continue", exact: true }).click();
  await signup.getByRole("heading", { name: "Create your account" }).waitFor();
  assert.equal(await signup.getByPlaceholder("you@company.com").count(), 1);
  assert.equal(await signup.getByText(/Signing up at Pennsylvania State/).count(), 0);
  console.log("PASS signup: switching from student to company removes the school email restriction.");
} catch (error) {
  console.error(`Failed at ${page.url()}: ${(await page.locator("body").innerText()).slice(0,1500)}`);
  throw error;
} finally {
  await browser.close();
}
