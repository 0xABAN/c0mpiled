import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { StudentHome } from "@/backend/api/types";
import { getCurrentAccount, requireAccount } from "@/backend/accounts";
import { toBookSummaries } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { deleteFiles } from "@/backend/storage";
import { parseInput } from "@/backend/validation";

import { requestMemberships, requireBooksAtSchool } from "./membership";

/** The viewer's resume and join requests, or `null` for anyone but a school account. */
export async function getStudentHome(): Promise<StudentHome | null> {
  const current = await getCurrentAccount();
  if (current?.account?.accountType !== "school") return null;

  const resume = await db.query.resumes.findFirst({ where: eq(resumes.userId, current.account.id) });
  if (!resume) return { resume: null, memberships: [] };

  const rows = await db
    .select({ book: books, club: clubs, status: bookMembers.status, requestedAt: bookMembers.requestedAt })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(eq(bookMembers.resumeId, resume.id))
    .orderBy(desc(bookMembers.requestedAt));

  const summaries = await toBookSummaries(rows);

  return {
    resume: {
      id: resume.id,
      name: resume.contactName,
      profile: resume.profile,
      previewPageCount: resume.previewKeys.length,
      updatedAt: resume.updatedAt.toISOString(),
    },
    memberships: rows.map((row, index) => ({
      book: summaries[index],
      status: row.status,
      requestedAt: row.requestedAt.toISOString(),
    })),
  };
}

const requestInput = z.object({
  bookIds: z.array(z.uuid()).min(1, "Pick at least one club.").max(20),
  consent: z.literal(true, "Agree to share your resume with employers."),
});

/**
 * Asks to add the viewer's existing resume to more books at their school, without uploading
 * it again. Consent is per request, because each club sells its book to different companies.
 */
export async function requestBooks(rawInput: unknown): Promise<void> {
  const input = parseInput(requestInput, rawInput);
  const account = await requireAccount("school");

  const resume = await db.query.resumes.findFirst({ where: eq(resumes.userId, account.id) });
  if (!resume) throw new UserError("Add your resume first.");

  const requested = await requireBooksAtSchool(input.bookIds, account.schoolDomain!);
  await requestMemberships(db, { resumeId: resume.id, accountId: account.id, books: requested, consentedAt: new Date() });
}

/** Takes the viewer's resume out of one book (or withdraws a pending request). */
export async function leaveBook(rawBookId: unknown): Promise<void> {
  const bookId = parseInput(z.uuid(), rawBookId);
  const account = await requireAccount("school");

  const resume = await db.query.resumes.findFirst({ where: eq(resumes.userId, account.id) });
  if (!resume) throw new UserError("You haven't added a resume yet.");

  await db.delete(bookMembers).where(and(eq(bookMembers.bookId, bookId), eq(bookMembers.resumeId, resume.id)));
}

/**
 * Deletes the viewer's resume everywhere: the row, every membership (by cascade), the PDF, and
 * its preview pages. Recruiters who bought a book lose access to it from then on.
 */
export async function deleteResume(): Promise<void> {
  const account = await requireAccount("school");

  const [deleted] = await db
    .delete(resumes)
    .where(eq(resumes.userId, account.id))
    .returning({ pdfKey: resumes.pdfKey, previewKeys: resumes.previewKeys });

  if (!deleted) throw new UserError("You haven't added a resume yet.");

  // Delete the files only after the row is gone, so a failure here can't leave a resume without them.
  await deleteFiles([deleted.pdfKey, ...deleted.previewKeys]);
}
