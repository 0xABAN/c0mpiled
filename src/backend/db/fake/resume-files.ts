import { randomUUID } from "node:crypto";

import { redactResume } from "@/backend/redaction";

import type { FakeResume } from "./resume-content";
import { renderFakeResumePdf, SYNTHETIC_LABEL } from "./resume-pdf";

/** Only these namespaces identify invented people; shared demo logins have real Cognito IDs. */
export function isInventedUser(userId: string): boolean {
  return /^(seed|demo):/.test(userId);
}

type ResumeFiles = { userId: string; pdfKey: string; previewKeys: string[] };

/** Backfill only the exact legacy placeholder, never a real upload or an existing preview. */
export function isLegacyFakeResume(row: ResumeFiles & { id: string }): boolean {
  if (!isInventedUser(row.userId) || row.previewKeys.length !== 0) return false;
  const namespace = row.userId.split(":", 1)[0];
  return row.pdfKey === `${namespace}/${row.id}.pdf`;
}

/** Key shape alone is not proof of provenance; verify the PDF's synthetic marker as well. */
export function hasGeneratedFakeKeys(row: ResumeFiles): boolean {
  if (!isInventedUser(row.userId) || row.previewKeys.length !== 1) return false;
  const pdfPrefix = `resumes/${row.userId}/`;
  const previewPrefix = `previews/${row.userId}/`;
  const uuid = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
  return row.pdfKey.startsWith(pdfPrefix)
    && new RegExp(`^${uuid}\\.pdf$`, "i").test(row.pdfKey.slice(pdfPrefix.length))
    && row.previewKeys[0].startsWith(previewPrefix)
    && new RegExp(`^${uuid}/1\\.png$`, "i").test(row.previewKeys[0].slice(previewPrefix.length));
}

/** Read a source without trusting S3 metadata; never regenerate an unlabeled upload. */
export async function inspectFakeSource(pdf: Uint8Array, student: FakeResume): Promise<{ generated: boolean; creator: string | undefined }> {
  const mupdf = await import("mupdf");
  const document = mupdf.Document.openDocument(pdf, "application/pdf");
  try {
    if (!isInventedUser(student.userId) || document.countPages() !== 1) return { generated: false, creator: undefined };
    const page = document.loadPage(0);
    const text = page.toStructuredText("");
    try {
      const content = text.asText().replace(/\s+/g, " ");
      const required = [
        SYNTHETIC_LABEL, student.name, student.email, student.school, String(student.profile.gradYear),
        ...student.profile.majors, ...student.profile.skills,
        ...student.profile.experience.flatMap((job) => [job.title, job.org]),
      ];
      return { generated: required.every((value) => content.includes(value)), creator: document.getMetaData("info:Creator") };
    } finally {
      text.destroy();
      page.destroy();
    }
  } finally {
    document.destroy();
  }
}

/** Explicitly fictional content with existing profile facts preserved in a real source PDF. */
export async function makeFakeResumePdf(student: FakeResume): Promise<Uint8Array> {
  if (!isInventedUser(student.userId)) throw new Error("Synthetic PDFs are only for seed:/demo: people.");
  return renderFakeResumePdf(student);
}

/** Store both representations under fresh keys; callers attach them only after both succeed. */
export async function storeFakeResumeFiles(student: FakeResume): Promise<{ pdfKey: string; previewKeys: string[] }> {
  const pdf = await makeFakeResumePdf(student);
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
