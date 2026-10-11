import "server-only";

import { and, countDistinct, eq, ne } from "drizzle-orm";
import { z } from "zod";

import type { ResumeView, UnlockQuote } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { pendingBookSplits, splitBookPrice } from "@/backend/billing";
import { toBookSummaries } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes, unlocks, users } from "@/backend/db";

import { isVisibleResume, presentResumes, resumeViewColumns } from "./present";

/** How many resumes a recruiter can open: accepted members of the books they bought. */
export async function countUnlockedResumes(recruiterId: string): Promise<number> {
  const [{ unlocked }] = await db
    .select({ unlocked: countDistinct(bookMembers.resumeId) })
    .from(unlocks)
    .innerJoin(bookMembers, eq(bookMembers.bookId, unlocks.bookId))
    .where(and(eq(unlocks.recruiterId, recruiterId), eq(bookMembers.status, "accepted")));

  return unlocked;
}

/** Whether a school account's resume has been submitted to at least one book (and not rejected there). */
export async function hasSubmittedResume(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ resumeId: resumes.id })
    .from(resumes)
    .innerJoin(bookMembers, eq(bookMembers.resumeId, resumes.id))
    .where(and(eq(resumes.userId, userId), ne(bookMembers.status, "rejected")))
    .limit(1);

  return Boolean(row);
}

/** A resume any signed-in account can see, or `null` if it doesn't exist or isn't in any book. */
export async function getResume(rawId: unknown): Promise<ResumeView | null> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return null;

  const viewer = await requireAccount();

  const rows = await db
    .select(resumeViewColumns)
    .from(resumes)
    .innerJoin(users, eq(users.id, resumes.userId))
    .where(and(eq(resumes.id, id.data), isVisibleResume));

  const [view] = await presentResumes(rows, viewer.id);
  return view ?? null;
}

/**
 * The books a recruiter can buy to reveal a resume: one offer per book it was accepted into.
 * Roster's 5% fee is deducted from the listed price, and the book with the most resumes
 * is preselected. The quote is not payment authorization.
 */
export async function getUnlockQuote(rawResumeId: unknown): Promise<UnlockQuote | null> {
  // Anyone signed in can browse, but only companies buy books.
  const buyer = await requireAccount("recruiter");

  const resume = await getResume(rawResumeId);
  if (!resume) return null;

  const rows = await db
    .select({ book: books, club: clubs })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(and(eq(bookMembers.resumeId, resume.id), eq(bookMembers.status, "accepted")))
    .orderBy(clubs.name);

  const pending = new Map((await pendingBookSplits(buyer.id, rows.map(({ book }) => book.id)))
    .map(({ bookId, ...split }) => [bookId, split]));
  const offers = (await toBookSummaries(rows)).map((book) => ({
    book,
    ...(pending.get(book.id) ?? splitBookPrice(book.priceCents)),
  }));

  const largest = offers.reduce((best, offer) => (offer.book.resumeCount > best.book.resumeCount ? offer : best));

  return { resume, offers, recommendedBookId: largest.book.id };
}
