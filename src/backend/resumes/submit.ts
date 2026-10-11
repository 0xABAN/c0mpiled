import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ParsedResume } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { schoolName } from "@/backend/clubs";
import { db, resumes } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { redactResume } from "@/backend/redaction";
import { deleteFiles, getResumePdf, putPreviewPages, putResumePdf, resumePdfKey } from "@/backend/storage";
import { parseInput } from "@/backend/validation";

import { resumeColumns } from "./columns";
import { requestMemberships, requireBooksAtSchool } from "./membership";

/**
 * Amplify Hosting rejects request bodies over about 4.4 MB (413) before our code runs, so the
 * limit sits safely below that. Resumes are rarely over 1 MB.
 */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** Every PDF starts with these bytes; the browser-reported MIME type alone can't be trusted. */
const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

function looksLikePdf(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Stores a school account's resume PDF (form field `file`, at most 4 MB) and returns its
 * upload id. Nothing is attached to any book until `submitResume`.
 *
 * `parsed` is always `null` for now, so the student types their profile. Once the teammate's
 * `@/backend/parsing` exports `parseResume`, call it here to pre-fill the review form.
 */
export async function uploadResume(formData: FormData): Promise<{ uploadId: string; parsed: ParsedResume | null }> {
  const account = await requireAccount("school");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new UserError("Choose a PDF to upload.");
  if (file.size > MAX_PDF_BYTES) throw new UserError("PDFs must be 4 MB or smaller.");

  const pdf = new Uint8Array(await file.arrayBuffer());
  if (!looksLikePdf(pdf)) throw new UserError("That file isn't a PDF.");

  const uploadId = randomUUID();
  await putResumePdf(resumePdfKey(account.id, uploadId), pdf);

  return { uploadId, parsed: null };
}

const uploadIdInput = z.uuid();
const nameInput = z.string().trim().min(2, "Enter your name.").max(100);

/** The PDF the viewer uploaded as `uploadId`, redacted for `name` (Contract 3). */
async function redactUpload(userId: string, uploadId: string, name: string) {
  const pdfKey = resumePdfKey(userId, uploadId);
  const pdf = await getResumePdf(pdfKey);
  if (!pdf) throw new UserError("Upload your resume again.");

  return { pdfKey, pages: await redactResume(pdf, { name }) };
}

/**
 * What recruiters will see: the uploaded PDF with the student's identity blacked out, as PNG
 * data URLs. Saves nothing, so the review step can call it whenever the name changes.
 */
export async function previewRedaction(rawUploadId: unknown, rawName: unknown): Promise<{ pages: string[] }> {
  const uploadId = parseInput(uploadIdInput, rawUploadId);
  const name = parseInput(nameInput, rawName);
  const account = await requireAccount("school");

  const { pages } = await redactUpload(account.id, uploadId, name);
  return { pages: pages.map((png) => `data:image/png;base64,${Buffer.from(png).toString("base64")}`) };
}

const profileInput = z.object({
  gradYear: z.int().min(2000).max(2100),
  majors: z.array(z.string().trim().min(1).max(80)).min(1, "Add your major.").max(3),
  degree: z.enum(["BS", "MS", "PhD"]),
  seeking: z.array(z.enum(["internship", "full-time"])).min(1, "Pick internship, full-time, or both.").max(2),
  skills: z.array(z.string().trim().min(1).max(40)).max(12),
  experience: z.array(z.object({ title: z.string().trim().min(1).max(100), org: z.string().trim().min(1).max(100) })).max(3),
});

const submissionInput = z.object({
  bookIds: z.array(z.uuid()).min(1, "Pick at least one club.").max(20),
  uploadId: uploadIdInput,
  name: nameInput,
  profile: profileInput,
  consent: z.literal(true, "Agree to share your resume with employers."),
});

/**
 * Saves the student's one resume (replacing any earlier one everywhere) and requests to
 * join the chosen books, which must belong to clubs at the student's school. See
 * `requestMemberships` for how each request starts.
 *
 * The PDF is redacted again with the submitted name rather than trusting an earlier preview;
 * redaction is deterministic, so the stored pages match what the student reviewed.
 */
export async function submitResume(rawSubmission: unknown): Promise<void> {
  const submission = parseInput(submissionInput, rawSubmission);
  const account = await requireAccount("school");
  const schoolDomain = account.schoolDomain!;

  const requested = await requireBooksAtSchool(submission.bookIds, schoolDomain);
  const { pdfKey, pages } = await redactUpload(account.id, submission.uploadId, submission.name);
  const previewKeys = await putPreviewPages(account.id, pages);

  const columns = {
    contactName: submission.name,
    pdfKey,
    previewKeys,
    ...resumeColumns(submission.profile, schoolName(schoolDomain)),
  };
  const now = new Date();

  let replaced: { pdfKey: string; previewKeys: string[] } | null;
  try {
    replaced = await db.transaction(async (tx) => {
      const [previous] = await tx
        .select({ pdfKey: resumes.pdfKey, previewKeys: resumes.previewKeys })
        .from(resumes)
        .where(eq(resumes.userId, account.id));

      const [resume] = await tx
        .insert(resumes)
        .values({ userId: account.id, ...columns })
        .onConflictDoUpdate({ target: resumes.userId, set: { ...columns, updatedAt: now } })
        .returning({ id: resumes.id });

      await requestMemberships(tx, { resumeId: resume.id, accountId: account.id, books: requested, consentedAt: now });

      return previous ?? null;
    });
  } catch (error) {
    await deleteFiles(previewKeys);
    throw error;
  }

  // Delete the replaced files only after the new resume is committed.
  if (replaced) {
    await deleteFiles([...(replaced.pdfKey === pdfKey ? [] : [replaced.pdfKey]), ...replaced.previewKeys]);
  }
}
