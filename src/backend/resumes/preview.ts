import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getCurrentAccount, type Account } from "@/backend/accounts";
import { bookMembers, books, clubs, db, resumes } from "@/backend/db";
import { presignedFileUrl } from "@/backend/storage";

/**
 * Who may see a resume's redacted pages:
 * - recruiters, once the resume is accepted into any book (the same rule as browse);
 * - the student who owns it;
 * - officers of any club it asked to join, so they can check pending requests.
 */
async function canSeePreview(account: Account, resume: { id: string; userId: string }): Promise<boolean> {
  if (resume.userId === account.id) return true;

  if (account.accountType === "recruiter") {
    const [accepted] = await db
      .select({ one: sql`1` })
      .from(bookMembers)
      .where(and(eq(bookMembers.resumeId, resume.id), eq(bookMembers.status, "accepted")))
      .limit(1);
    return Boolean(accepted);
  }

  const [officer] = await db
    .select({ one: sql`1` })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(eq(bookMembers.resumeId, resume.id), eq(clubs.ownerId, account.id)))
    .limit(1);
  return Boolean(officer);
}

/**
 * A short-lived S3 link to one redacted page (`page` starts at 1), or `null` when the page
 * doesn't exist or the viewer may not see it. Both cases look the same to the caller, so the
 * route doesn't reveal which resumes exist.
 */
export async function getResumePreviewUrl(rawResumeId: unknown, rawPage: unknown): Promise<string | null> {
  const resumeId = z.uuid().safeParse(rawResumeId);
  const page = z.coerce.number().int().min(1).safeParse(rawPage);
  if (!resumeId.success || !page.success) return null;

  const current = await getCurrentAccount();
  if (!current?.account) return null;

  const resume = await db.query.resumes.findFirst({
    where: eq(resumes.id, resumeId.data),
    columns: { id: true, userId: true, previewKeys: true },
  });
  const key = resume?.previewKeys[page.data - 1];
  if (!resume || !key) return null;

  if (!(await canSeePreview(current.account, resume))) return null;
  return presignedFileUrl(key);
}
