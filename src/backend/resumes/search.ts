import "server-only";

import {
  and,
  arrayContains,
  arrayOverlaps,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import type { ResumeFilters, ResumePage } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { bookMembers, books, clubs, db, resumes, unlocks, users } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { parseInput } from "@/backend/validation";

import { isVisibleResume, presentResumes, resumeViewColumns } from "./present";

const PAGE_SIZE = 24;

const list = <T extends z.ZodType>(item: T) => z.array(item).max(50);

const filtersInput = z.object({
  q: z.string().trim().max(200),
  schools: list(z.string().trim().toLowerCase()),
  gradYears: list(z.int()),
  seeking: list(z.enum(["internship", "full-time"])),
  majors: list(z.string().trim().toLowerCase()),
  skills: list(z.string().trim().toLowerCase()),
  clubs: list(z.string().trim()),
  unlockedOnly: z.boolean(),
  sort: z.enum(["grad-year", "newest"]),
});

/**
 * Keyset pagination: the cursor is the last row's sort key. `createdAt` is Postgres's own text
 * for the timestamp, because a JS Date drops the microseconds and would skip or repeat rows.
 */
const cursorShape = z.object({ gradYear: z.int(), createdAt: z.string(), id: z.uuid() });
type Cursor = z.infer<typeof cursorShape>;

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string): Cursor {
  try {
    return cursorShape.parse(JSON.parse(Buffer.from(raw, "base64url").toString()));
  } catch {
    throw new UserError("That page link is no longer valid. Reload the search.");
  }
}

/** Escapes `%`, `_`, and `\` so a search word matches literally inside `ilike`. */
function likePattern(word: string): string {
  return `%${word.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** An accepted membership of the current resume in a book of a club matching `condition`. */
function inAcceptedClub(condition: SQL) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(bookMembers)
      .innerJoin(books, eq(books.id, bookMembers.bookId))
      .innerJoin(clubs, eq(clubs.id, books.clubId))
      .where(and(eq(bookMembers.resumeId, resumes.id), eq(bookMembers.status, "accepted"), condition)),
  );
}

/** The WHERE conditions for a set of filters. Any-of within a filter; every skill must match. */
function filterConditions(filters: ResumeFilters, recruiterId: string): SQL[] {
  const conditions: SQL[] = [isVisibleResume];

  if (filters.schools.length) conditions.push(inArray(users.schoolDomain, filters.schools));
  if (filters.gradYears.length) conditions.push(inArray(resumes.gradYear, filters.gradYears));
  if (filters.seeking.length) conditions.push(arrayOverlaps(resumes.seeking, filters.seeking));
  if (filters.majors.length) conditions.push(arrayOverlaps(resumes.majors, filters.majors));
  if (filters.skills.length) conditions.push(arrayContains(resumes.skills, filters.skills));
  if (filters.clubs.length) conditions.push(inAcceptedClub(inArray(clubs.slug, filters.clubs)));

  if (filters.unlockedOnly) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(bookMembers)
          .innerJoin(unlocks, eq(unlocks.bookId, bookMembers.bookId))
          .where(
            and(
              eq(bookMembers.resumeId, resumes.id),
              eq(bookMembers.status, "accepted"),
              eq(unlocks.recruiterId, recruiterId),
            ),
          ),
      ),
    );
  }

  // Every word must appear in the profile text or in the name of a club the resume is in.
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  for (const word of words) {
    const pattern = likePattern(word);
    conditions.push(or(ilike(resumes.searchText, pattern), inAcceptedClub(ilike(clubs.name, pattern)))!);
  }

  return conditions;
}

/** Rows after the cursor, in the order of `sort`. */
function afterCursor(sort: ResumeFilters["sort"], cursor: Cursor): SQL {
  const createdAt = sql`${cursor.createdAt}::timestamptz`;
  const newerFirst = or(
    lt(resumes.createdAt, createdAt),
    and(eq(resumes.createdAt, createdAt), lt(resumes.id, cursor.id)),
  )!;

  if (sort === "newest") return newerFirst;

  return or(gt(resumes.gradYear, cursor.gradYear), and(eq(resumes.gradYear, cursor.gradYear), newerFirst))!;
}

/**
 * One page of resumes for a recruiter, sorted by grad year then newest, or just newest.
 * Pass the previous page's `nextCursor` to continue.
 */
export async function listResumes(rawFilters: unknown, rawCursor: string | null): Promise<ResumePage> {
  const filters = parseInput(filtersInput, rawFilters);
  const recruiter = await requireAccount("recruiter");

  const conditions = filterConditions(filters, recruiter.id);
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;
  const order =
    filters.sort === "newest"
      ? [desc(resumes.createdAt), desc(resumes.id)]
      : [asc(resumes.gradYear), desc(resumes.createdAt), desc(resumes.id)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ ...resumeViewColumns, gradYear: resumes.gradYear, cursorTime: sql<string>`${resumes.createdAt}::text` })
      .from(resumes)
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(and(...conditions, cursor ? afterCursor(filters.sort, cursor) : undefined))
      .orderBy(...order)
      // One extra row tells us whether another page exists.
      .limit(PAGE_SIZE + 1),
    db
      .select({ total: count() })
      .from(resumes)
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(and(...conditions)),
  ]);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const hasMore = rows.length > PAGE_SIZE;

  return {
    items: await presentResumes(page, recruiter.id),
    total,
    nextCursor: hasMore && last ? encodeCursor({ gradYear: last.gradYear, createdAt: last.cursorTime, id: last.id }) : null,
  };
}
