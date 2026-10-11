import type { ResumeFilters, Seeking } from "@/frontend/lib/api/types";

/**
 * Browse filters live in the URL so every view is shareable and survives reloads.
 * Multi-value filters repeat their param: `?year=2027&year=2028&skill=Python`.
 */

/** URL param that opens a resume's detail view over the grid. */
export const SELECTED_PARAM = "r";

const PARAMS = {
  q: "q",
  schools: "school",
  gradYears: "year",
  seeking: "seeking",
  majors: "major",
  skills: "skill",
  clubs: "club",
  unlockedOnly: "unlocked",
  sort: "sort",
} as const;

export const EMPTY_FILTERS: ResumeFilters = {
  q: "",
  schools: [],
  gradYears: [],
  seeking: [],
  majors: [],
  skills: [],
  clubs: [],
  unlockedOnly: false,
  sort: "grad-year",
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Accepts `URLSearchParams` (client) or Next's `searchParams` object (server). */
export function parseFilters(input: URLSearchParams | SearchParamsRecord): ResumeFilters {
  const all = (key: string): string[] => {
    if (input instanceof URLSearchParams) return input.getAll(key);
    const value = input[key];
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
  };

  return {
    q: all(PARAMS.q)[0]?.trim() ?? "",
    schools: all(PARAMS.schools),
    gradYears: all(PARAMS.gradYears).map(Number).filter(Number.isInteger),
    seeking: all(PARAMS.seeking).filter((value): value is Seeking => value === "internship" || value === "full-time"),
    majors: all(PARAMS.majors),
    skills: all(PARAMS.skills),
    clubs: all(PARAMS.clubs),
    unlockedOnly: all(PARAMS.unlockedOnly)[0] === "1",
    sort: all(PARAMS.sort)[0] === "newest" ? "newest" : "grad-year",
  };
}

export function filtersToSearchParams(filters: ResumeFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q) params.set(PARAMS.q, filters.q);
  for (const school of filters.schools) params.append(PARAMS.schools, school);
  for (const year of filters.gradYears) params.append(PARAMS.gradYears, String(year));
  for (const seeking of filters.seeking) params.append(PARAMS.seeking, seeking);
  for (const major of filters.majors) params.append(PARAMS.majors, major);
  for (const skill of filters.skills) params.append(PARAMS.skills, skill);
  for (const club of filters.clubs) params.append(PARAMS.clubs, club);
  if (filters.unlockedOnly) params.set(PARAMS.unlockedOnly, "1");
  if (filters.sort !== EMPTY_FILTERS.sort) params.set(PARAMS.sort, filters.sort);

  return params;
}

/** `/browse?…` for these filters, optionally with a resume open. */
export function browseHref(filters: ResumeFilters, selectedId?: string | null): string {
  const params = filtersToSearchParams(filters);
  if (selectedId) params.set(SELECTED_PARAM, selectedId);

  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

/** Filters that narrow results (sort and search text don't count). */
export function activeFilterCount(filters: ResumeFilters): number {
  return (
    filters.schools.length +
    filters.gradYears.length +
    filters.seeking.length +
    filters.majors.length +
    filters.skills.length +
    filters.clubs.length +
    (filters.unlockedOnly ? 1 : 0)
  );
}

/** A key that changes whenever the result set would change. */
export function filtersKey(filters: ResumeFilters): string {
  return filtersToSearchParams(filters).toString();
}

/** Toggle `value` in a list filter. */
export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
