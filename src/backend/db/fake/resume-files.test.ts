// node --conditions=react-server --import tsx --test src/backend/db/fake/resume-files.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import type { ResumeProfile } from "@/backend/parsing/types";
import { redactResume } from "@/backend/redaction";

import { fakeResumeContent } from "./resume-content";
import { hasGeneratedFakeKeys, inspectFakeSource, isLegacyFakeResume, makeFakeResumePdf } from "./resume-files";
import { makeTextPdf } from "./pdf";
import { SYNTHETIC_LABEL, TEMPLATE_VERSION } from "./resume-pdf";

const profile: ResumeProfile = {
  gradYear: 2028,
  degree: "BS",
  majors: ["Information Sciences & Technology", "Computer Engineering"],
  seeking: ["internship"],
  skills: ["Python", "TypeScript", "React", "PostgreSQL", "MATLAB", "Machine Learning", "Power Systems", "Financial Modeling", "SolidWorks", "Supply Chain", "Tableau", "Excel"],
  experience: [
    { org: "Johns Hopkins APL", title: "Manufacturing Engineering Co-op" },
    { org: "Northrop Grumman", title: "Investment Banking Summer Analyst" },
    { org: "Johnson & Johnson", title: "Electrical Engineering Intern" },
  ],
};
const student = { userId: "seed:42", name: "Casey Example", email: "casey@example.com", school: "Pennsylvania State University", profile };

test("only untouched legacy fake rows qualify for backfill", async () => {
  const row = { id: "resume-id", userId: "seed:42", pdfKey: "seed/resume-id.pdf", previewKeys: [] as string[] };
  assert.ok(isLegacyFakeResume(row));
  assert.ok(isLegacyFakeResume({ ...row, userId: "demo:student-2", pdfKey: "demo/resume-id.pdf" }));
  assert.equal(isLegacyFakeResume({ ...row, userId: "real-cognito-id" }), false);
  assert.equal(isLegacyFakeResume({ ...row, userId: "notseed:42" }), false);
  assert.equal(isLegacyFakeResume({ ...row, userId: "demo:student-2" }), false);
  assert.equal(isLegacyFakeResume({ ...row, pdfKey: "resumes/seed:42/upload.pdf" }), false);
  assert.equal(isLegacyFakeResume({ ...row, pdfKey: "seed/another-resume.pdf" }), false);
  assert.equal(isLegacyFakeResume({ ...row, previewKeys: ["previews/seed:42/1.png"] }), false);
  await assert.rejects(() => makeFakeResumePdf({ ...student, userId: "real-cognito-id" }), /only for seed:\/demo:/);
});

test("synthetic source retains full rows, bullets and dates inside the page and redacts", async () => {
  const mupdf = await import("mupdf");
  const pdf = await makeFakeResumePdf(student);
  const document = mupdf.Document.openDocument(pdf, "application/pdf");
  const page = document.loadPage(0);
  const text = page.toStructuredText("");

  try {
    assert.equal(document.countPages(), 1);
    const content = text.asText().replace(/\s+/g, " ");
    assert.equal(document.getMetaData("info:Creator"), TEMPLATE_VERSION);
    const details = fakeResumeContent(student);
    for (const expected of [student.name, student.email, student.school, SYNTHETIC_LABEL, "May 2026", "TECHNICAL SKILLS", ...details.projects.map((project) => project.name), ...profile.majors, ...profile.skills]) {
      assert.ok(content.includes(expected), `Missing source text: ${expected}`);
    }
    for (const job of profile.experience) {
      assert.ok(content.includes(job.org));
      assert.ok(content.includes(job.title));
    }
    const faces = new Set<string>();
    text.walk({
      beginLine(bounds) {
        assert.ok(bounds[0] >= 40 && bounds[2] <= 572, `Text exceeds horizontal margins: ${bounds}`);
        assert.ok(bounds[1] >= 15 && bounds[3] <= 776, `Text exceeds vertical margins: ${bounds}`);
      },
      onChar(_char, _origin, font) {
        assert.ok(font.isSerif(), "Jake-style source must use serif type.");
        faces.add(font.isBold() ? "bold" : font.isItalic() ? "italic" : "regular");
      },
    });
    assert.deepEqual([...faces].sort(), ["bold", "italic", "regular"]);
  } finally {
    text.destroy();
    page.destroy();
    document.destroy();
  }

  const pages = await redactResume(pdf, { name: student.name });
  assert.equal(pages.length, 1);
  assert.deepEqual([...pages[0].slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("refresh requires owner-scoped generated keys and labeled source content", async () => {
  const uuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const row = { userId: student.userId, pdfKey: `resumes/${student.userId}/${uuid}.pdf`, previewKeys: [`previews/${student.userId}/${uuid}/1.png`] };
  assert.ok(hasGeneratedFakeKeys(row));
  assert.equal(hasGeneratedFakeKeys({ ...row, userId: "real-cognito-id" }), false);
  assert.equal(hasGeneratedFakeKeys({ ...row, pdfKey: `resumes/demo:student-1/${uuid}.pdf` }), false);
  assert.equal(hasGeneratedFakeKeys({ ...row, previewKeys: [`previews/demo:student-1/${uuid}/1.png`] }), false);
  assert.equal(hasGeneratedFakeKeys({ ...row, previewKeys: [] }), false);

  const uploaded = makeTextPdf([student.name, student.email, student.school]);
  assert.equal((await inspectFakeSource(uploaded, student)).generated, false, "Never regenerate an unlabeled upload.");
  const generated = await makeFakeResumePdf(student);
  assert.deepEqual(await inspectFakeSource(generated, student), { generated: true, creator: TEMPLATE_VERSION });
  assert.equal((await inspectFakeSource(generated, { ...student, email: "different@example.com" })).generated, false);
});

test("fictional detail varies by person and domain without changing profile facts", () => {
  const first = fakeResumeContent(student);
  assert.deepEqual(fakeResumeContent(student), first, "A person's details should stay deterministic.");
  assert.notDeepEqual(fakeResumeContent({ ...student, userId: "demo:student-9" }), first);
  const mechanical = fakeResumeContent({ ...student, profile: { ...profile, majors: ["Mechanical Engineering"] } });
  assert.notDeepEqual(mechanical.projects, first.projects);
  assert.ok(mechanical.experience.flatMap((job) => job.bullets).some((bullet) => /design|prototype|simulation|assembly/i.test(bullet)));
  assert.deepEqual(first.experience.map(({ title, org }) => ({ title, org })), profile.experience);
  assert.ok(first.experience.every((job) => !/202[7-9]/.test(job.dates)), "Fictional past jobs must not be in the future.");
});
