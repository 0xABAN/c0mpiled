import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { BookSummary, ClubCreated, ClubDashboard, ClubSummary, Membership } from "@/backend/api/types";
import { getCurrentAccount, requireAccount } from "@/backend/accounts";
import { bookMembers, books, clubs, db, isUniqueViolation, resumes, unlocks, users } from "@/backend/db";
import { activeUnlocks, billingConfig } from "@/backend/billing";
import { UserError } from "@/backend/errors";
import { parseInput } from "@/backend/validation";

import { findOwnedClub, HUES, schoolName, toBookSummaries, toClubSummary } from "./summary";

/** Where members go to request to join a club's book. */
export function joinUrl(origin: string, slug: string): string {
  return new URL(`/join/${slug}`, origin).toString();
}

/** "psu.edu" → "psu", "harrisburg.psu.edu" → "harrisburg-psu". */
function domainStem(domain: string): string {
  return domain.replace(/\.edu$/, "").replaceAll(".", "-");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Club slugs are globally unique because they start with the school: "psu-hkn". A name that
 * already starts with the school's stem ("PSU HKN") doesn't repeat it.
 */
function clubSlug(schoolDomain: string, name: string): string {
  const stem = domainStem(schoolDomain);
  const nameSlug = slugify(name);
  if (!nameSlug) throw new UserError("Use letters or numbers in the club name.");

  return nameSlug.startsWith(`${stem}-`) ? nameSlug : `${stem}-${nameSlug}`;
}

/** "Fall 2026" from August to December, "Spring 2027" from January to July. */
function currentTerm(now = new Date()): string {
  return `${now.getMonth() >= 7 ? "Fall" : "Spring"} ${now.getFullYear()}`;
}

/** Prices are whole cents, up to $10,000 per book. */
const priceCents = z.int().min(0).max(1_000_000);

const clubInput = z.object({
  name: z.string().trim().min(2, "Enter the club's name.").max(80),
  tagline: z.string().trim().max(120).nullable().transform((tagline) => tagline || null),
  hue: z.enum(HUES),
  priceCents,
  payoutEmail: z.email("Enter a valid payout email."),
});

/** Creates the viewer's club at their school, together with its one book. */
export async function createClub(rawInput: unknown, origin: string): Promise<ClubCreated> {
  const input = parseInput(clubInput, rawInput);
  const account = await requireAccount("school");

  const owned = await findOwnedClub(account.id);
  if (owned) throw new UserError(`You already run ${owned.club.name}.`);

  const slug = clubSlug(account.schoolDomain!, input.name);

  try {
    const { club, book } = await db.transaction(async (tx) => {
      const [club] = await tx
        .insert(clubs)
        .values({ ...input, slug, schoolDomain: account.schoolDomain!, ownerId: account.id })
        .returning();

      const [book] = await tx
        .insert(books)
        .values({ clubId: club.id, title: currentTerm(), priceCents: input.priceCents })
        .returning();

      return { club, book };
    });

    return { club: toClubSummary(club), bookId: book.id, joinUrl: joinUrl(origin, club.slug) };
  } catch (error) {
    if (isUniqueViolation(error, "clubs_slug_unique")) {
      throw new UserError(`${input.name} is already listed at ${schoolName(account.schoolDomain!)}.`);
    }
    throw error;
  }
}

/** The club the viewer runs, or throws if they don't run one. */
async function requireOwnedClub() {
  const account = await requireAccount("school");
  const owned = await findOwnedClub(account.id);
  if (!owned) throw new UserError("Create your club first.");
  return owned;
}

/**
 * Accepts or rejects a student's request to join the viewer's book. Officers can also
 * change their mind later, e.g. to remove an accepted member.
 */
export async function decideJoinRequest(rawResumeId: unknown, rawDecision: unknown): Promise<void> {
  const resumeId = parseInput(z.uuid(), rawResumeId);
  const decision = parseInput(z.enum(["accepted", "rejected"]), rawDecision);
  const { book } = await requireOwnedClub();

  const updated = await db
    .update(bookMembers)
    .set({ status: decision, decidedAt: new Date() })
    .where(and(eq(bookMembers.bookId, book.id), eq(bookMembers.resumeId, resumeId)))
    .returning({ resumeId: bookMembers.resumeId });

  if (updated.length === 0) throw new UserError("That request no longer exists.");
}

/** Changes the price of the viewer's book. Past purchases keep the price they paid. */
export async function updateBookPrice(rawPriceCents: unknown): Promise<void> {
  const newPrice = parseInput(priceCents, rawPriceCents);
  const { book } = await requireOwnedClub();

  await db.update(books).set({ priceCents: newPrice }).where(eq(books.id, book.id));
}

/** A club and its book id, for the public join page. `null` if no club has this slug. */
export async function getClubBySlug(rawSlug: unknown): Promise<(ClubSummary & { bookId: string }) | null> {
  const slug = z.string().max(120).safeParse(rawSlug);
  if (!slug.success) return null;

  const [row] = await db
    .select({ club: clubs, bookId: books.id })
    .from(clubs)
    .innerJoin(books, eq(books.clubId, clubs.id))
    .where(eq(clubs.slug, slug.data));

  return row ? { ...toClubSummary(row.club), bookId: row.bookId } : null;
}

/** Books at the viewer's school that they can request to join. */
export async function listOpenBooks(): Promise<BookSummary[]> {
  const account = await requireAccount("school");

  const rows = await db
    .select({ book: books, club: clubs })
    .from(books)
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .where(eq(clubs.schoolDomain, account.schoolDomain!))
    .orderBy(clubs.name);

  return toBookSummaries(rows);
}

/** Everything /dashboard shows, or `null` when the viewer doesn't run a club. */
export async function getClubDashboard(origin: string): Promise<ClubDashboard | null> {
  const current = await getCurrentAccount();
  if (current?.account?.accountType !== "school") return null;

  const owned = await findOwnedClub(current.account.id);
  if (!owned) return null;

  const [[book], memberRows, unlockRows] = await Promise.all([
    toBookSummaries([owned]),
    db
      .select({
        resumeId: bookMembers.resumeId,
        status: bookMembers.status,
        requestedAt: bookMembers.requestedAt,
        decidedAt: bookMembers.decidedAt,
        name: resumes.contactName,
        email: users.email,
        profile: resumes.profile,
        previewKeys: resumes.previewKeys,
      })
      .from(bookMembers)
      .innerJoin(resumes, eq(resumes.id, bookMembers.resumeId))
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(eq(bookMembers.bookId, owned.book.id)),
    db
      .select({
        company: users.company,
        priceCents: unlocks.priceCents,
        platformFeeCents: unlocks.platformFeeCents,
        clubPayoutCents: unlocks.clubPayoutCents,
        unlockedAt: unlocks.createdAt,
      })
      .from(unlocks)
      .innerJoin(users, eq(users.id, unlocks.recruiterId))
      .where(and(eq(unlocks.bookId, owned.book.id), activeUnlocks()))
      .orderBy(desc(unlocks.createdAt)),
  ]);

  // Pending requests first, oldest first (they've waited longest); then members, newest first.
  const pending = memberRows
    .filter((row) => row.status === "pending")
    .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  const accepted = memberRows
    .filter((row) => row.status === "accepted")
    .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));

  const memberships: Membership[] = [...pending, ...accepted].map((row) => ({
    resumeId: row.resumeId,
    name: row.name,
    email: row.email,
    profile: row.profile,
    previewPageCount: row.previewKeys.length,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
  }));

  const bookUnlocks = unlockRows.map((row) => {
    // Recruiters can only buy after setup, which records their company.
    if (!row.company) throw new Error("A book purchase belongs to a recruiter without a company.");
    return { ...row, company: row.company, unlockedAt: row.unlockedAt.toISOString() };
  });

  return {
    club: toClubSummary(owned.club),
    billingMode: billingConfig().mode,
    book,
    joinUrl: joinUrl(origin, owned.club.slug),
    memberships,
    unlocks: bookUnlocks,
    earnedCents: bookUnlocks.reduce((sum, unlock) => sum + unlock.clubPayoutCents, 0),
  };
}
