import "server-only";

import data from "./us-schools.json";

/**
 * A US school and the email domains its students and staff use. `domains[0]` is the primary
 * domain, which identifies the school everywhere else ("psu.edu").
 */
export type School = { name: string; domains: string[] };

/**
 * `us-schools.json` is the United States subset of Hipo's university-domains-list (MIT),
 * https://github.com/Hipo/university-domains-list, keeping only `.edu` domains and dropping
 * schools without one.
 */
const SCHOOLS: School[] = data;

const BY_DOMAIN = new Map(SCHOOLS.flatMap((school) => school.domains.map((domain) => [domain, school] as const)));

/** Lowercase words without punctuation: "Penn-State " → ["penn", "state"]. */
function words(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

const INDEX = SCHOOLS.map((school) => ({ school, words: words(school.name) }));

/**
 * Typeahead over US schools.
 *
 * A school matches when every query word starts some word of its name ("penn state" finds
 * "Pennsylvania State University"), or when the query starts one of its domains ("psu").
 *
 * Ranking: an exact domain ("mit" → mit.edu) first, then names whose first word matches,
 * then shorter names, so a main campus ranks above its branch campuses.
 */
export function searchSchools(query: string, limit = 8): School[] {
  const queryWords = words(query);
  if (queryWords.length === 0) return [];

  const compact = queryWords.join("");

  const matches = INDEX.filter(
    (entry) =>
      queryWords.every((queryWord) => entry.words.some((word) => word.startsWith(queryWord))) ||
      entry.school.domains.some((domain) => domain.startsWith(compact)),
  );

  const rank = (entry: (typeof INDEX)[number]) => {
    if (entry.school.domains.includes(`${compact}.edu`)) return 0;
    if (entry.words[0]?.startsWith(queryWords[0])) return 1;
    return 2;
  };

  return matches
    .sort((a, b) => rank(a) - rank(b) || a.school.name.length - b.school.name.length)
    .slice(0, limit)
    .map((entry) => entry.school);
}

/** The school that uses this email domain, or `null`. Accepts any of a school's domains. */
export function findSchool(domain: string): School | null {
  return BY_DOMAIN.get(domain.toLowerCase()) ?? null;
}

/**
 * Whether an email address belongs to the school: its domain is one of the school's domains,
 * or a subdomain of one ("alumni.psu.edu" counts for "psu.edu").
 */
export function isSchoolEmail(email: string, school: School): boolean {
  const domain = email.toLowerCase().split("@").at(-1) ?? "";
  return school.domains.some((schoolDomain) => domain === schoolDomain || domain.endsWith(`.${schoolDomain}`));
}

/** The school's primary domain, which is how the database refers to it. */
export function primaryDomain(school: School): string {
  return school.domains[0];
}
