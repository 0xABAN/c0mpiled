import "server-only";

import { count, countDistinct, desc, eq, sql } from "drizzle-orm";

import type { FacetOption, Hue, ResumeFacets } from "@/backend/api/types";
import { requireAccount } from "@/backend/accounts";
import { schoolName } from "@/backend/clubs";
import { bookMembers, books, clubs, db, resumes, users } from "@/backend/db";

import { isVisibleResume } from "./present";

/** Long tails (rare skills) are cut off; the rail shows the most common values. */
const MAX_TERMS = 100;

const SEEKING_LABELS = { internship: "Internship", "full-time": "Full-time" } as const;

/**
 * Options for a free-form profile list (majors or skills), grouped case-insensitively and
 * shown with the casing most resumes use, counted once per resume. The value is that same
 * display text: filters match case-insensitively, so URLs read `?major=Computer+Science`.
 */
async function termFacet(field: "majors" | "skills"): Promise<FacetOption[]> {
  const term = sql`term`;
  const displayText = sql<string>`mode() within group (order by ${term})`;

  const rows = await db
    .select({
      value: displayText,
      label: displayText,
      count: countDistinct(resumes.id),
    })
    .from(sql`${resumes}, jsonb_array_elements_text(${resumes.profile} -> ${field}) as ${term}`)
    .where(isVisibleResume)
    .groupBy(sql`lower(${term})`)
    .orderBy(desc(countDistinct(resumes.id)), sql`lower(${term})`)
    .limit(MAX_TERMS);

  return rows;
}

/** Filter rail options with counts over every resume a signed-in account can see (not the current filters). */
export async function getResumeFacets(): Promise<ResumeFacets> {
  await requireAccount();

  const [schoolRows, yearRows, seekingRows, majors, skills, clubRows] = await Promise.all([
    db
      .select({ domain: users.schoolDomain, count: count() })
      .from(resumes)
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(isVisibleResume)
      .groupBy(users.schoolDomain)
      .orderBy(desc(count())),
    db
      .select({ year: resumes.gradYear, count: count() })
      .from(resumes)
      .where(isVisibleResume)
      .groupBy(resumes.gradYear)
      .orderBy(resumes.gradYear),
    // The alias must differ from the `seeking` column, or Postgres reports it as ambiguous.
    db
      .select({ value: sql<string>`seeking_value`, count: count() })
      .from(sql`${resumes}, unnest(${resumes.seeking}) as seeking_value`)
      .where(isVisibleResume)
      .groupBy(sql`seeking_value`)
      .orderBy(sql`seeking_value`),
    termFacet("majors"),
    termFacet("skills"),
    db
      .select({ slug: clubs.slug, name: clubs.name, hue: clubs.hue, count: count() })
      .from(bookMembers)
      .innerJoin(books, eq(books.id, bookMembers.bookId))
      .innerJoin(clubs, eq(clubs.id, books.clubId))
      .where(eq(bookMembers.status, "accepted"))
      .groupBy(clubs.id)
      .orderBy(desc(count()), clubs.name),
  ]);

  return {
    schools: schoolRows.map((row) => {
      // Only school accounts have resumes, and school accounts always have a school.
      if (!row.domain) throw new Error("A visible resume belongs to an account without a school.");
      return { value: row.domain, label: schoolName(row.domain), count: row.count };
    }),
    gradYears: yearRows.map((row) => ({ value: String(row.year), label: String(row.year), count: row.count })),
    seeking: seekingRows.map((row) => ({
      value: row.value,
      label: SEEKING_LABELS[row.value as keyof typeof SEEKING_LABELS],
      count: row.count,
    })),
    majors,
    skills,
    clubs: clubRows.map((row) => ({ value: row.slug, label: row.name, hue: row.hue as Hue, count: row.count })),
  };
}
