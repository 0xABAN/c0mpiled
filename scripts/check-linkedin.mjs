/**
 * Read-only LinkedIn UI check against a running app with public demos.
 * Uses a client-only student fixture and mocked successful saves; never changes shared profiles.
 * Invalid student input and unauthorized company writes do reach the real validation/auth guards.
 * PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-linkedin.mjs
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch();
const linkedinUrl = "https://www.linkedin.com/in/roster-ui-check";
const fixture = {
  id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", name: "Casey Example", linkedinUrl: null,
  profile: { gradYear: 2028, degree: "BS", majors: ["Computer Science"], seeking: ["internship"], skills: [], experience: [] },
  previewPageCount: 0, updatedAt: "2026-10-11T00:00:00.000Z",
};
let actionId;
let mode = "invalid";

try {
  const login = await browser.newPage();
  await login.goto(base);
  await login.getByRole("button", { name: "Student", exact: true }).click();
  await login.waitForURL(`${base}/resume`);
  const student = await browser.newContext({ storageState: await login.context().storageState(), viewport: { width: 1280, height: 900 } });
  const page = await student.newPage();
  page.setDefaultTimeout(15000);

  await page.route("**/resume*", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      actionId = request.headers()["next-action"];
      assert.ok(actionId);
      const [value] = JSON.parse(request.postData());
      if (mode === "invalid") {
        assert.equal(value, "https://evil.example/in/not-linkedin");
        return route.continue(); // Known invalid URL: cannot write anything.
      }
      if (mode === "offline") return route.abort();
      assert.equal(value, mode === "clear" ? "" : "linkedin.com/in/roster-ui-check?trk=share");
      return route.fulfill({
        status: 200, contentType: "text/x-component",
        body: `0:{"a":"$@1","f":[]}\n1:${JSON.stringify({ status: "ok", data: mode === "clear" ? null : linkedinUrl })}\n`,
      });
    }
    const response = await route.fetch();
    if (request.headers().rsc !== "1") return route.fulfill({ response });
    return route.fulfill({ response, body: fixtureHome(await response.text()) });
  });

  // Client navigation lets the actual StudentHome component render isolated fixture props.
  await page.goto(`${base}/browse`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "My resume", exact: true }).click();
  const form = page.getByRole("form", { name: "LinkedIn contact", exact: true });
  const input = form.getByRole("textbox", { name: /^LinkedIn/ });
  const save = form.getByRole("button", { name: "Save LinkedIn", exact: true });
  await form.waitFor();
  assert.ok(await save.isDisabled());

  await input.fill("https://evil.example/in/not-linkedin");
  await save.click();
  await form.getByRole("alert").waitFor();
  assert.match(await form.getByRole("alert").textContent(), /LinkedIn profile/);
  assert.equal(await input.inputValue(), "https://evil.example/in/not-linkedin");

  mode = "save";
  await input.fill("linkedin.com/in/roster-ui-check?trk=share");
  await save.click();
  await page.getByText("LinkedIn saved", { exact: true }).waitFor();
  assert.equal(await input.inputValue(), linkedinUrl);
  assert.ok(await save.isDisabled());

  await input.fill("unsaved draft");
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await input.inputValue(), linkedinUrl);
  mode = "offline";
  await input.fill("linkedin.com/in/another-profile");
  await save.click();
  await form.getByRole("alert").getByText("Could not save LinkedIn. Try again.").waitFor();
  assert.equal(await input.inputValue(), "linkedin.com/in/another-profile", "Failed save must retain the draft.");

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await input.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (process.env.SHOT_DIR) {
      await mkdir(process.env.SHOT_DIR, { recursive: true });
      await page.screenshot({ path: `${process.env.SHOT_DIR}/linkedin-${width}.png`, animations: "disabled" });
    }
  }
  mode = "clear";
  await input.fill("");
  await save.click();
  await page.getByText("LinkedIn removed", { exact: true }).waitFor();
  assert.ok(await save.isDisabled());

  await login.goto(base);
  await login.getByRole("button", { name: "Company", exact: true }).click();
  await login.waitForURL(`${base}/browse`);
  const company = await browser.newContext({ storageState: await login.context().storageState(), viewport: { width: 1280, height: 900 } });
  const companyPage = await company.newPage();
  await companyPage.route("**/browse?*", async (route) => {
    const response = await route.fetch();
    if (route.request().headers().rsc !== "1") return route.fulfill({ response });
    return route.fulfill({ response, body: (await response.text()).replaceAll('"linkedinUrl":null', `"linkedinUrl":${JSON.stringify(linkedinUrl)}`) });
  });
  await companyPage.goto(`${base}/browse`, { waitUntil: "networkidle" });
  await companyPage.getByRole("group", { name: "Resume view" }).getByRole("button", { name: /^Unlocked/ }).click();
  await companyPage.waitForURL((url) => url.searchParams.get("unlocked") === "1");
  await companyPage.waitForFunction(() => document.querySelector('[aria-label="Resumes"]')?.getAttribute("aria-busy") === "false");
  await companyPage.getByRole("region", { name: "Resumes", exact: true }).locator('a[href*="r="]').first().click();
  const link = companyPage.getByRole("dialog").getByRole("link", { name: "LinkedIn", exact: true });
  await link.waitFor();
  assert.equal(await link.getAttribute("href"), linkedinUrl);
  assert.equal(await link.getAttribute("target"), "_blank");
  assert.ok((await link.getAttribute("rel")).includes("noopener"));
  await companyPage.setViewportSize({ width: 320, height: 900 });
  await link.scrollIntoViewIfNeeded();
  assert.ok(await link.isVisible());
  assert.ok(await companyPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  // A company cannot invoke the student mutation, even with its valid action ID.
  const denied = await company.request.post(`${base}/browse`, {
    headers: { "next-action": actionId, "content-type": "text/plain;charset=UTF-8", origin: base },
    data: JSON.stringify([linkedinUrl]),
  });
  assert.match(await denied.text(), /This needs a school account/);
  console.log("PASS: optional field, real URL rejection, mocked save/remove, cancel, failed-save retention, mobile contact link, and server-side company write denial; no profile writes.");
} finally {
  // Finish intercepted refresh/prefetch requests before disposing their authenticated contexts.
  for (const context of browser.contexts()) {
    for (const page of context.pages()) await page.unrouteAll({ behavior: "wait" });
  }
  await browser.close();
}

/** Replace only StudentHome props in JSON Flight records; no database fixture or test route. */
function fixtureHome(body) {
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "resume") && Array.isArray(value.memberships)) value.resume = fixture;
    for (const child of Object.values(value)) visit(child);
  }
  return body.split("\n").map((line) => {
    const colon = line.indexOf(":");
    if (colon < 0) return line;
    let record;
    try { record = JSON.parse(line.slice(colon + 1)); } catch { return line; }
    visit(record);
    return `${line.slice(0, colon + 1)}${JSON.stringify(record)}`;
  }).join("\n");
}
