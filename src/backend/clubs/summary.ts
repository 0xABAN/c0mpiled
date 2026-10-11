import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";

import type { BookSummary, ClubSummary, Hue } from "@/backend/api/types";
import { bookMembers, books, clubs, db } from "@/backend/db";
import { findSchool } from "@/backend/schools";

export type ClubRow = typeof clubs.$inferSelect;
export type BookRow = typeof books.$inferSelect;

/** Category colors a club can pick. The UI owns the palette; keep this in sync with `Hue`. */
export const HUES = ["green", "blue", "purple", "orange", "teal", "pink", "red", "yellow"] as const satisfies readonly Hue[];

/** The display name of a school stored by its primary domain. */
export function schoolName(domain: string): string {
  const school = findSchool(domain);
  if (!school) throw new Error(`Unknown school domain in the database: ${domain}`);
  return school.name;
}

export function toClubSummary(club: ClubRow): ClubSummary {
  return {
    id: club.id,
    slug: club.slug,
    name: club.name,
    tagline: club.tagline,
    school: schoolName(club.schoolDomain),
    hue: club.hue as Hue,
  };
}

/** Accepted members per book, for `BookSummary.resumeCount`. Books without members are absent. */
export async function countAcceptedMembers(bookIds: string[]): Promise<Map<string, number>> {
  if (bookIds.length === 0) return new Map();

  const rows = await db
    .select({ bookId: bookMembers.bookId, members: count() })
    .from(bookMembers)
    .where(and(inArray(bookMembers.bookId, bookIds), eq(bookMembers.status, "accepted")))
    .groupBy(bookMembers.bookId);

  return new Map(rows.map((row) => [row.bookId, row.members]));
}

/** Book summaries for (book, club) pairs, with accepted-member counts. */
export async function toBookSummaries(rows: { book: BookRow; club: ClubRow }[]): Promise<BookSummary[]> {
  const counts = await countAcceptedMembers(rows.map((row) => row.book.id));

  return rows.map(({ book, club }) => ({
    id: book.id,
    club: toClubSummary(club),
    resumeCount: counts.get(book.id) ?? 0,
    priceCents: book.priceCents,
  }));
}

/** The club a school account runs, with its book, or `null`. */
export async function findOwnedClub(userId: string): Promise<{ club: ClubRow; book: BookRow } | null> {
  const [row] = await db
    .select({ club: clubs, book: books })
    .from(clubs)
    .innerJoin(books, eq(books.clubId, clubs.id))
    .where(eq(clubs.ownerId, userId))
    .limit(1);

  return row ?? null;
}
