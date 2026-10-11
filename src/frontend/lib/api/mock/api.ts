/**
 * In-memory implementation of the API in `../index.ts` and `../actions.ts`.
 * Behavior mirrors the agreed rules (filter semantics, sort order, unlock access) so the
 * UI is exercised against realistic responses. Deleted when the real backend lands.
 */

import type {
  BookSummary,
  FacetOption,
  OfferKind,
  ResumeFacets,
  ResumeFilters,
  ResumePage,
  ResumeView,
  School,
  UnlockOffer,
  UnlockQuote,
  Viewer,
} from "../types";
import { BOOKS, RESUMES, SCHOOLS, type MockResume } from "./fixtures";
import { readSession, readUnlocks, type MockUnlocks } from "./session";

/** Placeholder prices; real ones come from billing. Clubs keep 80%. */
const PRICE_CENTS: Record<OfferKind, number> = { resume: 1900, book: 14900 };
const CLUB_SHARE = 0.8;

export async function getViewer(): Promise<Viewer | null> {
  const session = await readSession();
  if (!session) return null;

  const unlocks = await readUnlocks();

  return {
    ...session,
    id: `user_${session.email}`,
    unlockedCount: RESUMES.filter((resume) => isUnlocked(resume, unlocks)).length,
  };
}

function isUnlocked(resume: MockResume, unlocks: MockUnlocks) {
  return unlocks.resumeIds.includes(resume.id) || resume.books.some((book) => unlocks.bookIds.includes(book.id));
}

/** Strip contact info unless the viewer is a recruiter who unlocked the resume. */
async function present(resumes: MockResume[]): Promise<ResumeView[]> {
  const session = await readSession();
  const unlocks = await readUnlocks();
  const isRecruiter = session?.accountType === "recruiter";

  return resumes.map((resume) => ({
    ...resume,
    contact: isRecruiter && isUnlocked(resume, unlocks) ? resume.contact : null,
  }));
}

function matches(resume: MockResume, filters: ResumeFilters, unlocks: MockUnlocks) {
  const { profile } = resume;
  const anyOf = <T>(wanted: T[], actual: T[]) => wanted.length === 0 || wanted.some((value) => actual.includes(value));
  const allOf = <T>(wanted: T[], actual: T[]) => wanted.every((value) => actual.includes(value));

  if (!anyOf(filters.schools, [resume.school.domain])) return false;
  if (!anyOf(filters.gradYears, [profile.gradYear])) return false;
  if (!anyOf(filters.seeking, profile.seeking)) return false;
  if (!anyOf(filters.majors, profile.majors)) return false;
  if (!allOf(filters.skills, profile.skills)) return false;
  if (!anyOf(filters.clubs, resume.books.map((book) => book.club.slug))) return false;
  if (filters.unlockedOnly && !isUnlocked(resume, unlocks)) return false;

  if (filters.q) {
    const haystack = [
      ...profile.majors,
      ...profile.skills,
      ...profile.experience.flatMap((job) => [job.title, job.org]),
      ...resume.books.map((book) => book.club.name),
      resume.school.name,
      String(profile.gradYear),
    ]
      .join(" ")
      .toLowerCase();

    if (!filters.q.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))) return false;
  }

  return true;
}

function compare(sort: ResumeFilters["sort"]) {
  const newest = (a: MockResume, b: MockResume) => b.createdAt.localeCompare(a.createdAt);
  if (sort === "newest") return newest;
  return (a: MockResume, b: MockResume) => a.profile.gradYear - b.profile.gradYear || newest(a, b);
}

/** Recruiters only. Anyone else gets an empty page (the route redirects them first). */
export async function listResumes(filters: ResumeFilters, cursor: string | null, limit = 24): Promise<ResumePage> {
  const session = await readSession();
  if (session?.accountType !== "recruiter") return { items: [], total: 0, nextCursor: null };

  const unlocks = await readUnlocks();
  const all = RESUMES.filter((resume) => matches(resume, filters, unlocks)).sort(compare(filters.sort));

  const offset = cursor ? Number(cursor) : 0;
  const items = all.slice(offset, offset + limit);
  const nextOffset = offset + items.length;

  return {
    items: await present(items),
    total: all.length,
    nextCursor: nextOffset < all.length ? String(nextOffset) : null,
  };
}

function countBy(values: string[], label: (value: string) => string = (value) => value): FacetOption[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function getResumeFacets(): Promise<ResumeFacets> {
  const profiles = RESUMES.map((resume) => resume.profile);

  return {
    schools: countBy(
      RESUMES.map((resume) => resume.school.domain),
      (domain) => RESUMES.find((resume) => resume.school.domain === domain)!.school.name,
    ),
    gradYears: countBy(profiles.map((p) => String(p.gradYear))).sort((a, b) => a.value.localeCompare(b.value)),
    seeking: countBy(profiles.flatMap((p) => p.seeking), (value) => (value === "internship" ? "Internship" : "Full-time")),
    majors: countBy(profiles.flatMap((p) => p.majors)),
    skills: countBy(profiles.flatMap((p) => p.skills)),
    clubs: BOOKS.map((book) => ({ value: book.club.slug, label: book.club.name, hue: book.club.hue, count: book.resumeCount })),
  };
}

export async function getResume(id: string): Promise<ResumeView | null> {
  const resume = findMockResume(id);
  return resume ? (await present([resume]))[0] : null;
}

/** Books at the viewer's school that a student can request to join. */
export async function listOpenBooks(): Promise<BookSummary[]> {
  const session = await readSession();
  return BOOKS.filter((book) => !session?.school || book.club.school === session.school.name);
}

export async function searchSchools(query: string): Promise<School[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return SCHOOLS.filter(
    (school) => school.name.toLowerCase().includes(needle) || school.domains.some((domain) => domain.startsWith(needle)),
  ).slice(0, 8);
}

/** Every way to unlock a resume: by itself, or with one of the books it's in. */
export function quoteOffers(resume: MockResume): UnlockOffer[] {
  const split = (priceCents: number) => ({ priceCents, clubPayoutCents: Math.round(priceCents * CLUB_SHARE) });

  const single: UnlockOffer = {
    key: "resume",
    kind: "resume",
    book: null,
    beneficiaries: resume.books.map((book) => book.club),
    resumeCount: 1,
    ...split(PRICE_CENTS.resume),
  };

  const books = resume.books.map((ref): UnlockOffer => {
    const book = BOOKS.find((candidate) => candidate.id === ref.id)!;
    return {
      key: `book:${book.id}`,
      kind: "book",
      book,
      beneficiaries: [book.club],
      resumeCount: book.resumeCount,
      ...split(PRICE_CENTS.book),
    };
  });

  return [single, ...books];
}

export async function getUnlockQuote(resumeId: string): Promise<UnlockQuote | null> {
  const resume = findMockResume(resumeId);
  if (!resume) return null;

  const offers = quoteOffers(resume);

  return { resume: (await present([resume]))[0], offers, recommended: offers[1]?.key ?? offers[0].key };
}

export function findMockResume(id: string) {
  return RESUMES.find((candidate) => candidate.id === id) ?? null;
}

