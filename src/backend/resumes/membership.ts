import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { bookMembers, books, clubs, db, type Database } from "@/backend/db";
import { UserError } from "@/backend/errors";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type RequestableBook = { id: string; ownerId: string };

/** The requested books, with their owners. Throws unless every one is at the student's school. */
export async function requireBooksAtSchool(bookIds: string[], schoolDomain: string): Promise<RequestableBook[]> {
  const unique = [...new Set(bookIds)];

  const rows = await db
    .select({ id: books.id, ownerId: clubs.ownerId })
    .from(books)
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(inArray(books.id, unique), eq(clubs.schoolDomain, schoolDomain)));

  if (rows.length !== unique.length) throw new UserError("You can only join books at your school.");
  return rows;
}

/**
 * Asks to put a resume in each book. Requests start `pending` for the officer to decide; an
 * officer joining their own club's book is accepted right away. Books the resume was already
 * requested for keep their status, so a rejected student can't re-request their way in.
 */
export async function requestMemberships(
  executor: Database | Transaction,
  { resumeId, accountId, books: requested, consentedAt }: { resumeId: string; accountId: string; books: RequestableBook[]; consentedAt: Date },
): Promise<void> {
  await executor
    .insert(bookMembers)
    .values(
      requested.map((book) => {
        const ownBook = book.ownerId === accountId;
        return {
          bookId: book.id,
          resumeId,
          status: ownBook ? ("accepted" as const) : ("pending" as const),
          consentedAt,
          decidedAt: ownBook ? consentedAt : null,
        };
      }),
    )
    .onConflictDoNothing();
}
