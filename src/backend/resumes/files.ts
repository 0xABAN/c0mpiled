import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getCurrentAccount, type Account } from "@/backend/accounts";
import { bookMembers, books, clubs, db, resumes, unlocks } from "@/backend/db";
import { activeUnlocks } from "@/backend/billing";
import { presignedFileUrl } from "@/backend/storage";

/**
 * Who may open a resume's files. Both routes answer `null` when the file doesn't exist or the
 * viewer may not see it, so they can't be used to discover which resumes exist.
 */

type ResumeFiles = { id: string; userId: string; contactName: string; pdfKey: string; previewKeys: string[] };

async function findResumeFiles(rawResumeId: unknown): Promise<{ account: Account; resume: ResumeFiles } | null> {
  const resumeId = z.uuid().safeParse(rawResumeId);
  if (!resumeId.success) return null;

  const current = await getCurrentAccount();
  if (!current?.account) return null;

  const resume = await db.query.resumes.findFirst({
    where: eq(resumes.id, resumeId.data),
    columns: { id: true, userId: true, contactName: true, pdfKey: true, previewKeys: true },
  });

  return resume ? { account: current.account, resume } : null;
}

/** Whether the viewer runs a club whose book this resume asked to join, in any status. */
async function isOfficerFor(account: Account, resumeId: string): Promise<boolean> {
  const [row] = await db
    .select({ one: sql`1` })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(eq(bookMembers.resumeId, resumeId), eq(clubs.ownerId, account.id)))
    .limit(1);

  return Boolean(row);
}

/**
 * Redacted pages: any signed-in account once the resume is accepted into a book (the same rule
 * as browse), and before that only the student who owns it and officers of clubs it asked to join.
 */
async function canSeePreview(account: Account, resume: ResumeFiles): Promise<boolean> {
  if (resume.userId === account.id) return true;

  const [accepted] = await db
    .select({ one: sql`1` })
    .from(bookMembers)
    .where(and(eq(bookMembers.resumeId, resume.id), eq(bookMembers.status, "accepted")))
    .limit(1);

  if (accepted) return true;
  return account.accountType === "school" && isOfficerFor(account, resume.id);
}

/**
 * The original PDF: recruiters only after buying a book the resume is accepted into, the
 * student who owns it, and officers of any club it asked to join (they already see the
 * student's name and email).
 */
async function canSeePdf(account: Account, resume: ResumeFiles): Promise<boolean> {
  if (resume.userId === account.id) return true;
  if (account.accountType === "school") return isOfficerFor(account, resume.id);

  const [purchased] = await db
    .select({ one: sql`1` })
    .from(unlocks)
    .innerJoin(bookMembers, eq(bookMembers.bookId, unlocks.bookId))
    .where(
      and(activeUnlocks(), eq(unlocks.recruiterId, account.id), eq(bookMembers.resumeId, resume.id), eq(bookMembers.status, "accepted")),
    )
    .limit(1);

  return Boolean(purchased);
}

/** A short-lived S3 link to one redacted page (`page` starts at 1), or `null`. */
export async function getResumePreviewUrl(rawResumeId: unknown, rawPage: unknown): Promise<string | null> {
  const page = z.coerce.number().int().min(1).safeParse(rawPage);
  if (!page.success) return null;

  const found = await findResumeFiles(rawResumeId);
  const key = found?.resume.previewKeys[page.data - 1];
  if (!found || !key) return null;

  if (!(await canSeePreview(found.account, found.resume))) return null;
  return presignedFileUrl(key);
}

/** "Casey Example - Resume.pdf", keeping only characters every browser handles in a header. */
function downloadName(contactName: string, resumeId: string): string {
  const safe = contactName.normalize("NFKD").replace(/[^A-Za-z0-9 .'-]/g, "").trim();
  return `${safe || resumeId} - Resume.pdf`;
}

/**
 * A short-lived S3 link to the original PDF, or `null`. With `download`, the browser saves it
 * under the student's name instead of showing it inline.
 */
export async function getResumePdfUrl(rawResumeId: unknown, download: boolean): Promise<string | null> {
  const found = await findResumeFiles(rawResumeId);
  if (!found) return null;

  if (!(await canSeePdf(found.account, found.resume))) return null;
  return presignedFileUrl(found.resume.pdfKey, download ? { downloadAs: downloadName(found.resume.contactName, found.resume.id) } : {});
}
