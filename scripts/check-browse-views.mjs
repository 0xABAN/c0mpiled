/**
 * Read-only check of the company All / Unlocked controls. No purchases or saved changes.
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-browse-views.mjs
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(15000);
let releaseResponse;

try {
  await page.goto(base);
  await page.getByRole("button", { name: "Company", exact: true }).click();
  await page.waitForURL(`${base}/browse`);
  await page.goto(`${base}/browse?q=Python&sort=newest`, { waitUntil: "networkidle" });

  const views = page.getByRole("group", { name: "Resume view", exact: true });
  const all = views.getByRole("button", { name: "All resumes", exact: true });
  const unlocked = views.getByRole("button", { name: /^Unlocked/ });
  const results = page.getByRole("region", { name: "Resumes", exact: true });
  assert.equal(await all.getAttribute("aria-pressed"), "true");

  // Hold the server response to prove selection feedback does not wait for the network.
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route("**/browse?*", async (route) => {
    if (route.request().headers().rsc === "1" && new URL(route.request().url()).searchParams.get("unlocked") === "1") {
      await responseGate;
    }
    await route.continue();
  });
  await unlocked.click();
  await page.getByText("Updating resumes…", { exact: true }).waitFor();
  assert.equal(await unlocked.getAttribute("aria-pressed"), "true");
  assert.equal(await all.getAttribute("aria-pressed"), "false");
  await page.waitForFunction(() => {
    const active = document.querySelector('[aria-label="Resume view"] button[aria-pressed="true"]');
    return active && getComputedStyle(active).backgroundColor === "rgb(255, 77, 0)";
  });
  releaseResponse();
  await page.waitForURL((url) => url.searchParams.get("unlocked") === "1");
  await page.waitForFunction(() => document.querySelector('[aria-label="Resumes"]')?.getAttribute("aria-busy") === "false");
  await page.unroute("**/browse?*");
  assert.equal(new URL(page.url()).searchParams.get("q"), "Python");
  assert.equal(new URL(page.url()).searchParams.get("sort"), "newest");
  assert.equal(await results.getByText("Locked", { exact: true }).count(), 0);
  assert.ok(await results.getByText("Unlocked", { exact: true }).count() > 0);

  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const button of [all, unlocked]) {
      const bounds = await button.boundingBox();
      assert.ok(bounds.height >= 44 && bounds.width >= 44, "View controls need comfortable tap targets.");
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, "View control extends offscreen.");
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await all.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => !url.searchParams.has("unlocked"));
    await page.waitForFunction(() => document.querySelector('[aria-label="Resumes"]')?.getAttribute("aria-busy") === "false");
    assert.equal(await all.getAttribute("aria-pressed"), "true");
    await unlocked.click();
    await page.waitForURL((url) => url.searchParams.get("unlocked") === "1");
    await page.waitForFunction(() => document.querySelector('[aria-label="Resumes"]')?.getAttribute("aria-busy") === "false");
    if (process.env.SHOT_DIR) {
      await mkdir(process.env.SHOT_DIR, { recursive: true });
      await page.screenshot({ path: `${process.env.SHOT_DIR}/views-${width}.png`, animations: "disabled" });
    }
  }
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await unlocked.getAttribute("aria-pressed"), "true", "Reload must preserve the view.");

  await page.goto(base);
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL(`${base}/resume`);
  await page.goto(`${base}/browse`, { waitUntil: "networkidle" });
  assert.equal(await views.count(), 0, "Students must not see purchase-view controls.");
  console.log("PASS: immediate selection/loading feedback, preserved filters, purchased-only results, keyboard, mobile tap targets, reload, and student privacy.");
} finally {
  releaseResponse?.();
  await browser.close();
}
