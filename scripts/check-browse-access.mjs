/**
 * Read-only browser smoke check against a running app; never modifies accounts or books.
 * Use saved Playwright storage states for a student and a company. LOCKED_RESUME_ID must
 * name an accepted resume with a real preview, outside the student's clubs and unbought
 * by the company. PURCHASED_RESUME_ID must have a real PDF in a book the company owns.
 * Keep these auth-state files outside the repository.
 *
 * STUDENT_STATE=/tmp/student.json COMPANY_STATE=/tmp/company.json \
 * LOCKED_RESUME_ID=<uuid> PURCHASED_RESUME_ID=<uuid> node scripts/check-browse-access.mjs
 *
 * BASE_URL defaults to localhost:3100. PLAYWRIGHT_MODULE can point to an existing Playwright
 * installation's index.mjs when it isn't locally installed; no new dependency is needed.
 */
import assert from "node:assert/strict";

const { STUDENT_STATE, COMPANY_STATE, LOCKED_RESUME_ID, PURCHASED_RESUME_ID } = process.env;
assert.ok(STUDENT_STATE && COMPANY_STATE && LOCKED_RESUME_ID && PURCHASED_RESUME_ID, "Set STUDENT_STATE, COMPANY_STATE, LOCKED_RESUME_ID and PURCHASED_RESUME_ID.");
for (const id of [LOCKED_RESUME_ID, PURCHASED_RESUME_ID]) assert.match(id, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);

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
  assert.ok(await page.locator('a[href*="r="] article').count() > 0, "Small cards should retain their stylized thumbnails.");
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
    assert.equal(await dialog.locator("article").count(), 0, "The full-size document must never be drawn from a profile summary.");

    const document = await dialog.locator('img[src*="/preview/"]').first().evaluate((img) => ({
      radius: parseFloat(getComputedStyle(img.parentElement).borderRadius),
      width: img.clientWidth,
      height: img.clientHeight,
      ratio: img.naturalHeight / img.naturalWidth,
    }));
    assert.ok(document.radius > 0, "Keep the rounded document frame.");
    assert.ok(Math.abs(document.height - document.width * document.ratio) < 2, "Show the complete page without cropping or distorting rows.");
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
  const sidebar = companyDialog.getByRole("complementary");
  assert.equal(await sidebar.getByRole("heading", { level: 3 }).count(), 2, "Only books and education belong in the sidebar.");
  assert.equal(await sidebar.getByRole("heading", { name: "Education", exact: true }).count(), 1);
  assert.equal(await sidebar.getByRole("heading", { name: /Experience|Skills/ }).count(), 0);
  const buy = sidebar.getByRole("link", { name: "Buy resume book", exact: true });
  assert.ok((await buy.getAttribute("href")).startsWith("/unlock/"), "Company lost checkout controls.");
  assert.deepEqual(await buy.evaluate((node) => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color })), {
    background: "rgb(255, 77, 0)", color: "rgb(255, 255, 255)",
  }, "Purchase control must be orange and white.");
  const badge = sidebar.getByText(/^(Internship|Full-time|Intern \+ Full-time)$/);
  const seekingTones = { Internship: "accent", "Full-time": "yellow", "Intern + Full-time": "neutral" };
  assert.equal(await badge.getAttribute("data-tone"), seekingTones[await badge.textContent()], "Employment badge must reflect the candidate’s seeking type.");
  console.log("PASS company: minimal sidebar, seeking-type badge, and purchase button.");

  await companyPage.goto(`${base}/browse?r=${PURCHASED_RESUME_ID}`, { waitUntil: "networkidle" });
  await companyDialog.waitFor();
  const pdf = companyDialog.locator('iframe[src*="/pdf"]');
  await pdf.waitFor();
  assert.equal(await companyDialog.locator("article").count(), 0, "Purchased resumes must also show their source document.");
  assert.equal(await companyDialog.getByRole("button", { name: "Summary", exact: true }).count(), 0);
  assert.ok(await pdf.evaluate((frame) => parseFloat(getComputedStyle(frame).borderRadius) > 0));
  const original = await company.request.get(new URL(await pdf.getAttribute("src"), base).href);
  assert.equal(original.status(), 200, "The purchased original must load, not a placeholder key.");
  assert.ok((await original.body()).subarray(0, 5).equals(Buffer.from("%PDF-")));
  console.log("PASS documents: actual redacted pages before purchase, original PDF after; rounded frames retained.");

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
