import type { ResumeProfile } from "@/backend/parsing/types";

/** Trim and collapse whitespace: "  Computer   Science " → "Computer Science". */
function clean(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Lowercased, de-duplicated terms for array filters. */
function terms(values: string[]): string[] {
  return [...new Set(values.map((value) => clean(value).toLowerCase()).filter(Boolean))];
}

/**
 * The `resumes` columns derived from a profile. Every write goes through this, so filters
 * and free-text search always agree with what the profile shows.
 *
 * - `profile` keeps the original casing for display, with whitespace cleaned so that
 *   lowercasing a displayed major or skill gives exactly its filter value.
 * - `majors` / `skills` are lowercased for case-insensitive array filters.
 * - `search_text` is everything a recruiter might type, minus the student's name.
 */
export function resumeColumns(rawProfile: ResumeProfile, schoolName: string) {
  const profile: ResumeProfile = {
    ...rawProfile,
    majors: rawProfile.majors.map(clean),
    skills: rawProfile.skills.map(clean),
    experience: rawProfile.experience.map((job) => ({ title: clean(job.title), org: clean(job.org) })),
  };

  const searchText = [
    ...profile.majors,
    ...profile.skills,
    ...profile.experience.flatMap((job) => [job.title, job.org]),
    profile.degree,
    String(profile.gradYear),
    schoolName,
  ]
    .join(" ")
    .toLowerCase();

  return {
    gradYear: profile.gradYear,
    majors: terms(profile.majors),
    seeking: [...new Set(profile.seeking)],
    skills: terms(profile.skills),
    profile,
    searchText,
  };
}
