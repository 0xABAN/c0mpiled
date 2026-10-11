// node --conditions=react-server --import tsx --test src/backend/db/fake/resume-files.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import type { ResumeProfile } from "@/backend/parsing/types";
import { redactResume } from "@/backend/redaction";

import { isLegacyFakeResume, makeFakeResumePdf } from "./resume-files";

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

test("only untouched legacy fake rows qualify for backfill", () => {
  const row = { id: "resume-id", userId: "seed:42", pdfKey: "seed/resume-id.pdf", previewKeys: [] as string[] };
  assert.ok(isLegacyFakeResume(row));
  assert.ok(isLegacyFakeResume({ ...row, userId: "demo:student-2", pdfKey: "demo/resume-id.pdf" }));
  assert.equal(isLegacyFakeResume({ ...row, userId: "real-cognito-id" }), false);
  assert.equal(isLegacyFakeResume({ ...row, userId: "notseed:42" }), false);
  assert.equal(isLegacyFakeResume({ ...row, userId: "demo:student-2" }), false);
  assert.equal(isLegacyFakeResume({ ...row, pdfKey: "resumes/seed:42/upload.pdf" }), false);
  assert.equal(isLegacyFakeResume({ ...row, pdfKey: "seed/another-resume.pdf" }), false);
  assert.equal(isLegacyFakeResume({ ...row, previewKeys: ["previews/seed:42/1.png"] }), false);
  assert.throws(() => makeFakeResumePdf({ ...student, userId: "real-cognito-id" }), /only for seed:\/demo:/);
});

test("synthetic source retains full rows, bullets and dates inside the page and redacts", async () => {
  const mupdf = await import("mupdf");
  const pdf = makeFakeResumePdf(student);
  const document = mupdf.Document.openDocument(pdf, "application/pdf");
  const page = document.loadPage(0);
  const text = page.toStructuredText("");

  try {
    assert.equal(document.countPages(), 1);
    const content = text.asText().replace(/\s+/g, " ");
    for (const expected of [student.name, student.email, student.school, "SYNTHETIC DEMO RESUME", "May - August 2027", "incorporated peer review feedback", ...profile.majors, ...profile.skills]) {
      assert.ok(content.includes(expected), `Missing source text: ${expected}`);
    }
    for (const job of profile.experience) {
      assert.ok(content.includes(job.org));
      assert.ok(content.includes(job.title));
    }
    text.walk({
      beginLine(bounds) {
        assert.ok(bounds[0] >= 50 && bounds[2] <= 562, `Text exceeds horizontal margins: ${bounds}`);
        assert.ok(bounds[1] >= 40 && bounds[3] <= 752, `Text exceeds vertical margins: ${bounds}`);
      },
    });
  } finally {
    text.destroy();
    page.destroy();
    document.destroy();
  }

  const pages = await redactResume(pdf, { name: student.name });
  assert.equal(pages.length, 1);
  assert.deepEqual([...pages[0].slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
