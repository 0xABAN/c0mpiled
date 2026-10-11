import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { ResumeView, UnlockQuote } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { toBookSummaries } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes, users } from "@/backend/db";

import { isVisibleResume, presentResumes, resumeViewColumns } from "./present";

/** A resume a recruiter can see, or `null` if it doesn't exist or isn't in any book. */
export async function getResume(rawId: unknown): Promise<ResumeView | null> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return null;

  const recruiter = await requireAccount("recruiter");

  const rows = await db
    .select(resumeViewColumns)
    .from(resumes)
    .innerJoin(users, eq(users.id, resumes.userId))
    .where(and(eq(resumes.id, id.data), isVisibleResume));

  const [view] = await presentResumes(rows, recruiter.id);
  return view ?? null;
}

/**
 * The books a recruiter can buy to reveal a resume: one offer per book it was accepted into.
 * The club earns what the recruiter pays (no platform fee is decided), and the book with
 * the most resumes is preselected.
 */
export async function getUnlockQuote(rawResumeId: unknown): Promise<UnlockQuote | null> {
  const resume = await getResume(rawResumeId);
  if (!resume) return null;

  const rows = await db
    .select({ book: books, club: clubs })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(eq(bookMembers.resumeId, resume.id), eq(bookMembers.status, "accepted")))
    .orderBy(clubs.name);

  const offers = (await toBookSummaries(rows)).map((book) => ({
    book,
    priceCents: book.priceCents,
    clubPayoutCents: book.priceCents,
  }));

  const largest = offers.reduce((best, offer) => (offer.book.resumeCount > best.book.resumeCount ? offer : best));

  return { resume, offers, recommendedBookId: largest.book.id };
}
