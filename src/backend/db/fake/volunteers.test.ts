// node --conditions=react-server --import tsx --test src/backend/db/fake/volunteers.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { redactResume } from "@/backend/redaction";
import { resumeColumns } from "@/backend/resumes/columns";

import { fakeResumeContent } from "./resume-content";
import { inspectFakeSource, makeFakeResumePdf } from "./resume-files";
import { VOLUNTEER_STUDENTS } from "./volunteers";

test("three fictional volunteers have searchable skills and matching, redactable one-page source documents", async () => {
  assert.equal(VOLUNTEER_STUDENTS.length, 3);
  assert.equal(new Set(VOLUNTEER_STUDENTS.map((student) => student.userId)).size, 3);
  const mupdf = await import("mupdf");

  for (const student of VOLUNTEER_STUDENTS) {
    assert.match(student.userId, /^demo:volunteer-/);
    assert.match(student.email, /@example\.com$/);
    assert.ok(student.profile.skills.includes("Volunteering"));
    assert.ok(student.profile.skills.length <= 12);
    assert.ok(student.profile.experience.every((job) => /volunteer/i.test(job.title) && job.org.startsWith("Demo ")));
    const columns = resumeColumns(student.profile, student.school);
    assert.ok(columns.skills.includes("volunteering"));
    assert.ok(columns.searchText.includes("volunteering"));

    const content = fakeResumeContent(student);
    assert.ok(content.projects.every((project) => /volunteer|nonprofit|fundraising/i.test(project.name)));
    const academic = fakeResumeContent({ ...student, profile: { ...student.profile, skills: ["Excel"] } });
    assert.equal(content.courses, academic.courses, "Nonprofit work must not change the student's degree coursework.");

    const pdf = await makeFakeResumePdf(student);
    assert.ok((await inspectFakeSource(pdf, student)).generated);
    const document = mupdf.Document.openDocument(pdf, "application/pdf");
    const page = document.loadPage(0);
    const text = page.toStructuredText("");
    try {
      assert.equal(document.countPages(), 1);
      assert.ok(text.asText().includes("Volunteering"));
      assert.ok(!text.asText().includes("TECHNICAL SKILLS"), "Volunteer and fundraising skills aren't exclusively technical.");
      text.walk({
        beginLine(bounds) {
          assert.ok(bounds[0] >= 40 && bounds[2] <= 572 && bounds[1] >= 15 && bounds[3] <= 776, `Clipped source text: ${bounds}`);
        },
      });
    } finally {
      text.destroy();
      page.destroy();
      document.destroy();
    }
    const previews = await redactResume(pdf, { name: student.name });
    assert.equal(previews.length, 1);
    assert.deepEqual([...previews[0].slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
