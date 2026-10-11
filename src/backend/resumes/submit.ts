import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ParsedResume } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { schoolName } from "@/backend/clubs";
import { db, resumes } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { deleteResumePdf, putResumePdf, resumePdfExists, resumePdfKey } from "@/backend/storage";
import { parseInput } from "@/backend/validation";

import { resumeColumns } from "./columns";
import { requestMemberships, requireBooksAtSchool } from "./membership";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Every PDF starts with these bytes; the browser-reported MIME type alone can't be trusted. */
const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

function looksLikePdf(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/**
 * Stores a school account's resume PDF (form field `file`, at most 5 MB) and returns its
 * upload id. Nothing is attached to any book until `submitResume`.
 *
 * `parsed` is always `null` for now, so the student types their profile. Once the teammate's
 * `@/backend/parsing` exports `parseResume`, call it here to pre-fill the review form.
 */
export async function uploadResume(formData: FormData): Promise<{ uploadId: string; parsed: ParsedResume | null }> {
  const account = await requireAccount("school");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new UserError("Choose a PDF to upload.");
  if (file.size > MAX_PDF_BYTES) throw new UserError("PDFs must be 5 MB or smaller.");

  const pdf = new Uint8Array(await file.arrayBuffer());
  if (!looksLikePdf(pdf)) throw new UserError("That file isn't a PDF.");

  const uploadId = randomUUID();
  await putResumePdf(resumePdfKey(account.id, uploadId), pdf);

  return { uploadId, parsed: null };
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
  uploadId: z.uuid(),
  name: z.string().trim().min(2, "Enter your name.").max(100),
  profile: profileInput,
  consent: z.literal(true, "Agree to share your resume with employers."),
});

/**
 * Saves the student's one resume (replacing any earlier one everywhere) and requests to
 * join the chosen books, which must belong to clubs at the student's school. See
 * `requestMemberships` for how each request starts.
 */
export async function submitResume(rawSubmission: unknown): Promise<void> {
  const submission = parseInput(submissionInput, rawSubmission);
  const account = await requireAccount("school");
  const schoolDomain = account.schoolDomain!;

  const pdfKey = resumePdfKey(account.id, submission.uploadId);
  if (!(await resumePdfExists(pdfKey))) throw new UserError("Upload your resume again.");

  const requested = await requireBooksAtSchool(submission.bookIds, schoolDomain);

  const columns = { contactName: submission.name, pdfKey, ...resumeColumns(submission.profile, schoolName(schoolDomain)) };
  const now = new Date();

  const previousPdfKey = await db.transaction(async (tx) => {
    const [previous] = await tx.select({ pdfKey: resumes.pdfKey }).from(resumes).where(eq(resumes.userId, account.id));

    const [resume] = await tx
      .insert(resumes)
      .values({ userId: account.id, ...columns })
      .onConflictDoUpdate({ target: resumes.userId, set: { ...columns, updatedAt: now } })
      .returning({ id: resumes.id });

    await requestMemberships(tx, { resumeId: resume.id, accountId: account.id, books: requested, consentedAt: now });

    return previous?.pdfKey ?? null;
  });

  // Delete the replaced PDF only after the new resume is committed.
  if (previousPdfKey && previousPdfKey !== pdfKey) await deleteResumePdf(previousPdfKey);
}
