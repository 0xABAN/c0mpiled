import type { Hue, Seeking } from "@/frontend/lib/api/types";

/**
 * Any color scope from the design tokens: the category hues clubs can pick, plus "accent",
 * which follows the theme's action color and isn't offered to clubs.
 */
export type Tone = Hue | "accent";

/** Every category hue, in the order shown by the club color picker. */
export const HUES: Hue[] = ["green", "blue", "purple", "orange", "teal", "pink", "red", "yellow"];

/** A stable hue for any name, so the same company always gets the same tile color. */
export function hueFor(name: string): Hue {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
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

/**
 * Resume cards are color-coded by what the candidate is looking for, the way
 * resumes.fyi codes by level: a solid tag plus a light wash of the same hue.
 * Orange is the accent, so it stays out of the coding and cards never compete with actions.
 */
export function seekingHue(seeking: Seeking[]): Hue {
  if (seeking.length > 1) return "purple";
  return seeking[0] === "full-time" ? "green" : "blue";
}

export function seekingLabel(seeking: Seeking[]): string {
  if (seeking.length > 1) return "Intern + Full-time";
  return seeking[0] === "full-time" ? "Full-time" : "Internship";
}
