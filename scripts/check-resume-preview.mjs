// Run against a dev server with demo accounts enabled:
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/check-resume-preview.mjs
// Optional: BASE_URL (default :3100), SHOT_DIR (screenshots outside the repo).
// Uploads an invented two-page draft; mocks final submission responses so the saved
// demo resume and memberships are never changed.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3100";

  await page.goto(baseUrl);
  await page.getByRole("button", { name: "Student", exact: true }).click();
  await page.waitForURL("**/resume");
  await page.goto(`${baseUrl}/join/psu-demo-club`);
  await page.getByRole("button", { name: "Join Demo Club", exact: true }).click();
  await page.getByLabel("Resume PDF").setInputFiles({ name: "preview-check.pdf", mimeType: "application/pdf", buffer: fakeResume() });
  await page.getByLabel("Your name", { exact: true }).fill("Casey Example", { timeout: 60_000 });
  const linkedinUrl = "https://www.linkedin.com/in/roster-preview-check";
  await page.getByRole("textbox", { name: /^LinkedIn/ }).fill(linkedinUrl);

  const trigger = page.getByRole("button", { name: "View full size", exact: true });
  await trigger.waitFor({ timeout: 60_000 });
  await page.getByText("Share my resume with companies", { exact: false }).click();

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await trigger.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await trigger.focus();
    const scroll = await page.evaluate(() => window.scrollY);
    const thumbnailWidth = (await trigger.locator("img").boundingBox()).width;
    if (process.env.SHOT_DIR) {
      await mkdir(process.env.SHOT_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.SHOT_DIR, `preview-${width}.png`) });
    }

    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Your redacted resume" });
    await dialog.waitFor();
    const pages = dialog.getByRole("img");
    assert.equal(await pages.count(), 2, "The overlay must show every page");
    await page.waitForFunction(() => [...document.querySelectorAll("dialog[open] img")].every((img) => img.complete && img.naturalWidth > 0));
    assert.ok((await pages.first().boundingBox()).width > thumbnailWidth * 2, "The overlay must be readable, not another thumbnail");
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden");
    assert.ok(await page.evaluate(() => document.activeElement.closest("dialog[open]") !== null), "Focus must move into the dialog");
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement.closest("dialog[open]") !== null), "Tab must stay in the modal");
    assert.ok(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth), "No horizontal overflow");
    if (process.env.SHOT_DIR) await page.screenshot({ path: join(process.env.SHOT_DIR, `preview-open-${width}.png`) });
    await pages.last().scrollIntoViewIfNeeded();
    assert.ok(await dialog.getByRole("button", { name: "Close", exact: true }).isVisible(), "Close must remain available while scrolling");

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate((element) => element === document.activeElement), "Escape must restore focus");
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - scroll) < 3, "Closing must preserve scroll position");
    assert.equal(await page.getByLabel("Your name", { exact: true }).inputValue(), "Casey Example");
    assert.equal(await page.getByRole("textbox", { name: /^LinkedIn/ }).inputValue(), linkedinUrl);
    assert.ok(await page.getByRole("checkbox").isChecked(), "Consent must survive opening the preview");

    await trigger.click();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await trigger.evaluate((element) => element === document.activeElement), "Close must restore focus");
    console.log(`PASS: ${width}px preview, all pages, keyboard, focus, and form preservation`);
  }

  await page.getByRole("button", { name: "2028", exact: true }).click();
  await page.getByRole("button", { name: "Internship", exact: true }).click();
  await page.getByPlaceholder("Add a major").fill("Computer Science");
  await page.getByPlaceholder("Add a major").press("Enter");

  // Exercise the real UI completion callbacks without replacing the shared demo's resume.
  // Next's action response contains the action result (a) and no router patch (f).
  let submissionResult = { status: "error", message: "Test submission rejected" };
  await page.route(`${baseUrl}/join/psu-demo-club`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    assert.ok(route.request().headers()["next-action"], "Expected a server action.");
    const [submission] = JSON.parse(route.request().postData());
    assert.equal(submission.linkedinUrl, linkedinUrl, "Review must include the optional contact link in submission.");
    await route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body: `0:{"a":"$@1","f":[]}\n1:${JSON.stringify(submissionResult)}\n`,
    });
  });

  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await page.getByRole("alert").getByText("Test submission rejected").waitFor();
  assert.equal(new URL(page.url()).pathname, "/join/psu-demo-club", "Failed submissions must not navigate.");

  submissionResult = { status: "ok" };
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await page.getByRole("heading", { name: "Request sent!", exact: true }).waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForURL(`${baseUrl}/browse`);
  console.log("PASS: rejected submission stays on review; successful completion opens browse.");

  assert.deepEqual(errors, [], "No browser runtime errors");
} finally {
  await browser.close();
}

/** A tiny valid PDF made only from invented text; no fixture or PDF dependency required. */
function fakeResume() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  for (const contentId of [5, 7]) {
    const lines = ["Casey Example", "casey.example@psu.edu", "Computer Science - Class of 2028", "EXPERIENCE", ...Array(28).fill("Example Company - Built accessible interfaces with TypeScript and React.")];
    const content = `BT /F1 12 Tf 48 744 Td 20 TL ${lines.map((line) => `(${line}) Tj T*`).join(" ")} ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
