import "server-only";

import { and, eq, exists, inArray, sql } from "drizzle-orm";

import type { BookRef, ResumeView } from "@/backend/api/types";
import { activeUnlocks } from "@/backend/billing";
import { schoolName, toClubSummary } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes, unlocks, users } from "@/backend/db";

/** Browse only ever shows resumes accepted into at least one book. */
export const isVisibleResume = exists(
  db
    .select({ one: sql`1` })
    .from(bookMembers)
    .where(and(eq(bookMembers.resumeId, resumes.id), eq(bookMembers.status, "accepted"))),
);

/** The columns `presentResumes` needs, selected from `resumes` joined with `users`. */
export const resumeViewColumns = {
  id: resumes.id,
  profile: resumes.profile,
  contactName: resumes.contactName,
  linkedinUrl: resumes.linkedinUrl,
  previewKeys: resumes.previewKeys,
  createdAt: resumes.createdAt,
  email: users.email,
  schoolDomain: users.schoolDomain,
};

type ResumeViewRow = {
  id: string;
  profile: ResumeView["profile"];
  contactName: string;
  linkedinUrl: string | null;
  previewKeys: string[];
  createdAt: Date;
  email: string;
  schoolDomain: string | null;
};

/**
 * Turns resume rows into what a viewer sees: the books each resume was accepted into, and
 * contact info only if the viewer (a company) has bought one of those books.
 */
export async function presentResumes(rows: ResumeViewRow[], viewerId: string): Promise<ResumeView[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [memberships, purchased] = await Promise.all([
    db
      .select({ resumeId: bookMembers.resumeId, bookId: books.id, club: clubs })
      .from(bookMembers)
      .innerJoin(books, eq(books.id, bookMembers.bookId))
      .innerJoin(clubs, eq(clubs.id, books.clubId))
      .where(and(inArray(bookMembers.resumeId, ids), eq(bookMembers.status, "accepted")))
      .orderBy(clubs.name),
    db.select({ bookId: unlocks.bookId }).from(unlocks).where(and(eq(unlocks.recruiterId, viewerId), activeUnlocks())),
  ]);

  const purchasedBookIds = new Set(purchased.map((row) => row.bookId));

  const booksByResume = new Map<string, BookRef[]>();
  for (const membership of memberships) {
    const refs = booksByResume.get(membership.resumeId) ?? [];
    refs.push({ id: membership.bookId, club: toClubSummary(membership.club) });
    booksByResume.set(membership.resumeId, refs);
  }

  return rows.map((row) => {
    // Only school accounts have resumes, and school accounts always have a school.
    if (!row.schoolDomain) throw new Error(`Resume ${row.id} belongs to an account without a school.`);

    const bookRefs = booksByResume.get(row.id) ?? [];
    const unlocked = bookRefs.some((book) => purchasedBookIds.has(book.id));

    return {
      id: row.id,
      school: { name: schoolName(row.schoolDomain), domain: row.schoolDomain },
      books: bookRefs,
      profile: row.profile,
      previewPageCount: row.previewKeys.length,
      contact: unlocked ? { name: row.contactName, email: row.email, linkedinUrl: row.linkedinUrl } : null,
      createdAt: row.createdAt.toISOString(),
    };
  });
}
