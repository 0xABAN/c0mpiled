/**
 * Read-only browser smoke check against a running app; never modifies accounts or books.
 * Use saved Playwright storage states for a student and a company. LOCKED_RESUME_ID must
 * name an accepted resume with a real preview, outside the student's clubs and unbought
 * by the company. Keep these auth-state files outside the repository.
 *
 * STUDENT_STATE=/tmp/student.json COMPANY_STATE=/tmp/company.json \
 * LOCKED_RESUME_ID=<uuid> node scripts/check-browse-access.mjs
 *
 * BASE_URL defaults to localhost:3100. PLAYWRIGHT_MODULE can point to an existing Playwright
 * installation's index.mjs when it isn't locally installed; no new dependency is needed.
 */
import assert from "node:assert/strict";

const { STUDENT_STATE, COMPANY_STATE, LOCKED_RESUME_ID } = process.env;
assert.ok(STUDENT_STATE && COMPANY_STATE && LOCKED_RESUME_ID, "Set STUDENT_STATE, COMPANY_STATE and LOCKED_RESUME_ID.");
assert.match(LOCKED_RESUME_ID, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);

const base = process.env.BASE_URL ?? "http://localhost:3100";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch();

try {
  const student = await browser.newContext({ storageState: STUDENT_STATE });
  const page = await student.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(`${base}/browse`, { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/browse", "Student cannot browse.");
  assert.equal(await page.getByRole("link", { name: "Browse", exact: true }).count(), 1);
  assert.equal(await page.getByRole("link", { name: "My resume", exact: true }).count(), 1, "Use a student session.");
  assert.ok(await page.locator('a[href*="r="]').count() > 0, "Student sees no resume cards.");
  assert.equal(await page.locator('a[title="Resumes you\'ve unlocked"]').count(), 0);
  assert.equal(await page.getByRole("button", { name: /^Unlocked/ }).count(), 0);

  await page.goto(`${base}/browse?r=${LOCKED_RESUME_ID}`, { waitUntil: "networkidle" });
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.getByRole("heading", { name: "Name hidden", exact: true }).count(), 1);
  await dialog.locator('img[src*="/preview/"]').first().waitFor();
  await page.waitForFunction(() => [...document.images].some((img) => img.src.includes("/preview/") && img.complete && img.naturalWidth > 0));

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await dialog.locator('a[href^="/unlock/"]').count(), 0, "Student sees checkout.");
    assert.equal(await dialog.locator('a[href*="/pdf"], iframe').count(), 0, "Student sees original PDF controls.");
  }

  for (const [suffix, expected] of [["preview/1", 302], ["pdf", 404]]) {
    const response = await student.request.get(`${base}/api/resumes/${LOCKED_RESUME_ID}/${suffix}`, { maxRedirects: 0 });
    assert.equal(response.status(), expected, `Student file access: ${suffix}`);
  }

  const checkout = await student.request.get(`${base}/unlock/${LOCKED_RESUME_ID}`, { maxRedirects: 0 });
  assert.equal(checkout.status(), 307, "Student can reach checkout.");
  console.log("PASS student: browse, redacted detail, no purchase controls; preview allowed, original denied.");

  const company = await browser.newContext({ storageState: COMPANY_STATE });
  const companyPage = await company.newPage();
  companyPage.setDefaultTimeout(15000);
  await companyPage.goto(`${base}/browse?r=${LOCKED_RESUME_ID}`, { waitUntil: "networkidle" });
  assert.equal(new URL(companyPage.url()).pathname, "/browse", "Company cannot browse.");
  const companyDialog = companyPage.getByRole("dialog");
  await companyDialog.waitFor();
  assert.ok(await companyDialog.locator('a[href^="/unlock/"]').count() > 0, "Company lost checkout controls.");
  console.log("PASS company: browse and purchase controls retained.");

  const guest = await browser.newContext();
  const anonymous = await guest.request.get(`${base}/browse`, { maxRedirects: 0 });
  assert.equal(anonymous.status(), 307);
  assert.equal(new URL(anonymous.headers().location, base).pathname, "/login");

  for (const suffix of ["preview/1", "pdf"]) {
    const response = await guest.request.get(`${base}/api/resumes/${LOCKED_RESUME_ID}/${suffix}`, { maxRedirects: 0 });
    assert.equal(response.status(), 404, `Signed-out file access: ${suffix}`);
  }
  console.log("PASS signed out: login required; preview and original denied.");
} finally {
  await browser.close();
}
