/**
 * Contract 1 (AGENTS.md): what `parseResume(pdf)` returns.
 * Only `profile` is shown to recruiters before a book is unlocked.
 */
export type ParsedResume = {
  contact: { name: string; email: string | null };
  profile: ResumeProfile;
};

export type ResumeProfile = {
  gradYear: number;
  majors: string[];
  degree: "BS" | "MS" | "PhD";
  seeking: Seeking[];
  /** At most 12. */
  skills: string[];
  /** At most 3, most recent first. */
  experience: { title: string; org: string }[];
};

export type Seeking = "internship" | "full-time";
