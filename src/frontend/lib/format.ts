import type { Degree, Seeking } from "@/frontend/lib/api/types";

const DEGREE_NAMES: Record<Degree, string> = { BS: "B.S.", MS: "M.S.", PhD: "Ph.D." };

export function formatDegree(degree: Degree): string {
  return DEGREE_NAMES[degree];
}

/** 1900 → "$19", 1520 → "$15.20". */
export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
  });
}

/** 2027 → "Class of 2027". */
export function classOf(year: number): string {
  return `Class of ${year}`;
}

/** pluralize(1, "resume") → "1 resume"; pluralize(3, "resume") → "3 resumes". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

const RELATIVE = new Intl.RelativeTimeFormat("en-US", { numeric: "auto", style: "short" });

/** "5 min. ago", "3 hr. ago", "yesterday". `now` is injectable so server and client agree. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (Math.abs(minutes) < 1) return "just now";
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(days, "day");
}

const MINOR_WORDS = new Set(["of", "the", "and", "at", "for", "in"]);

/**
 * Short label for a monogram. Prefers an acronym already in the name ("Penn State HKN" →
 * "HKN", "Penn State ARL" → "ARL"), otherwise the first letters of the first two
 * significant words ("Society of Women Engineers" → "SW", "Lockheed Martin" → "LM").
 */
export function initials(name: string): string {
  // Drop apostrophes first so "Builder's" stays one word.
  const words = name
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const acronym = words.find((word) => word.length >= 2 && word.length <= 3 && word === word.toUpperCase() && /\p{L}/u.test(word));
  if (acronym) return acronym;

  const significant = words.filter((word) => !MINOR_WORDS.has(word.toLowerCase()));
  if (significant.length === 0) return "?";
  if (significant.length === 1) return significant[0][0].toUpperCase();
  return (significant[0][0] + significant[1][0]).toUpperCase();
}

export function seekingLabel(seeking: Seeking[]): string {
  if (seeking.length > 1) return "Intern + Full-time";
  return seeking[0] === "full-time" ? "Full-time" : "Internship";
}
