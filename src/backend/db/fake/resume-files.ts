import { randomUUID } from "node:crypto";

import type { ResumeProfile } from "@/backend/parsing/types";
import { redactResume } from "@/backend/redaction";

import { makeTextPdf } from "./pdf";

type FakeResume = {
  userId: string;
  name: string;
  email: string;
  school: string;
  profile: ResumeProfile;
};

/** Only these namespaces identify invented people; shared demo logins have real Cognito IDs. */
export function isInventedUser(userId: string): boolean {
  return /^(seed|demo):/.test(userId);
}

/** Backfill only the exact legacy placeholder, never a real upload or an existing preview. */
export function isLegacyFakeResume(row: { id: string; userId: string; pdfKey: string; previewKeys: string[] }): boolean {
  if (!isInventedUser(row.userId) || row.previewKeys.length !== 0) return false;
  const namespace = row.userId.split(":", 1)[0];
  return row.pdfKey === `${namespace}/${row.id}.pdf`;
}

/** Wrap invented ASCII text to fit the existing one-page PDF renderer. Never drop words. */
function wrap(line: string): string[] {
  const lines = [""];
  for (const word of line.split(" ")) {
    if (word.length > 68) throw new Error("Synthetic resume contains a word too wide for its PDF.");
    const last = lines.length - 1;
    if (lines[last].length + word.length + 1 > 68) lines.push(word);
    else lines[last] += `${lines[last] ? " " : ""}${word}`;
  }
  return lines;
}

/**
 * An explicitly synthetic source document, not a reconstruction of anyone's uploaded resume.
 * Names/profile facts come from the fake row; dates and bullets are invented sample content.
 * Expanded previews must render this PDF, including the details absent from teaser profiles.
 */
export function makeFakeResumePdf(student: FakeResume): Uint8Array {
  if (!isInventedUser(student.userId)) throw new Error("Synthetic PDFs are only for seed:/demo: people.");

  const { profile } = student;
  const lines = [
    student.name,
    student.email,
    "SYNTHETIC DEMO RESUME - all experience below is invented.",
    "",
    "EDUCATION",
    student.school,
    `${profile.degree} - ${profile.majors.join(" and ")}`,
    `Expected graduation: May ${profile.gradYear}`,
    "",
    "EXPERIENCE",
    ...profile.experience.flatMap((job, index) => [
      `${job.org} | ${job.title}`,
      `May - August ${profile.gradYear - index - 1}`,
      "- Completed a team project from initial research through testing.",
      "- Documented findings and presented weekly progress to the team.",
      "",
    ]),
    "PROJECTS",
    `Student research project | September - December ${profile.gradYear - 2}`,
    "- Compared sample datasets and checked results against a baseline.",
    "- Delivered a written report and incorporated peer review feedback.",
    "",
    "SKILLS",
    profile.skills.join(", "),
  ].flatMap(wrap);

  // 42 lines at 16 pt leading stay inside the existing letter-size page's margins.
  if (lines.length > 42) throw new Error("Synthetic resume exceeds one page; shorten the sample template.");
  return makeTextPdf(lines);
}

/** Store both representations under fresh keys; callers attach them only after both succeed. */
export async function storeFakeResumeFiles(student: FakeResume): Promise<{ pdfKey: string; previewKeys: string[] }> {
  const pdf = makeFakeResumePdf(student);
  const pages = await redactResume(pdf, { name: student.name });
  const { deleteFiles, putPreviewPages, putResumePdf, resumePdfKey } = await import("@/backend/storage");
  const pdfKey = resumePdfKey(student.userId, randomUUID());
  const previewKeys = await putPreviewPages(student.userId, pages);

  try {
    await putResumePdf(pdfKey, pdf);
    return { pdfKey, previewKeys };
  } catch (error) {
    await deleteFiles([pdfKey, ...previewKeys]);
    throw error;
  }
}
