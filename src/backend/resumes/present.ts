import "server-only";

import { and, eq, exists, inArray, sql } from "drizzle-orm";

import type { BookRef, ResumeView } from "@/backend/api/types";
import { schoolName, toClubSummary } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes, unlocks, users } from "@/backend/db";

/** Recruiters only ever see resumes accepted into at least one book. */
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
  createdAt: resumes.createdAt,
  email: users.email,
  schoolDomain: users.schoolDomain,
};

type ResumeViewRow = {
  id: string;
  profile: ResumeView["profile"];
  contactName: string;
  createdAt: Date;
  email: string;
  schoolDomain: string | null;
};

/**
 * Turns resume rows into what a recruiter sees: the books each resume was accepted into,
 * and contact info only if the recruiter has bought one of those books.
 */
export async function presentResumes(rows: ResumeViewRow[], recruiterId: string): Promise<ResumeView[]> {
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
    db.select({ bookId: unlocks.bookId }).from(unlocks).where(eq(unlocks.recruiterId, recruiterId)),
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
      contact: unlocked ? { name: row.contactName, email: row.email } : null,
      createdAt: row.createdAt.toISOString(),
    };
  });
}
