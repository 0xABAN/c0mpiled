/**
 * Types shared between the UI and the backend.
 *
 * `ParsedResume` and `ResumeProfile` are Contract 1 from AGENTS.md, copied verbatim.
 * Everything else is a view model: the exact shape a page needs, so the backend can
 * assemble it with joins and the UI never sees table rows.
 */

/* ------------------------------------------------------------------ */
/* Contract 1: parser output                                           */
/* ------------------------------------------------------------------ */

/** What `parseResume(pdf)` returns. Only `profile` is shown before a resume is unlocked. */
export type ParsedResume = {
  contact: { name: string; email: string | null };
  profile: ResumeProfile;
};

export type ResumeProfile = {
  gradYear: number;
  majors: string[];
  degree: "BS" | "MS" | "PhD";
  seeking: ("internship" | "full-time")[];
  skills: string[]; // at most 12
  experience: { title: string; org: string }[]; // at most 3, most recent first
};

export type Degree = ResumeProfile["degree"];
export type Seeking = ResumeProfile["seeking"][number];
export type Contact = ParsedResume["contact"];

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/** Category colors from the design system. Clubs pick one during setup. */
export type Hue = "green" | "blue" | "purple" | "orange" | "teal" | "pink" | "red" | "yellow";

/**
 * `school`: signed up with a verified .edu email; can add a resume and/or own a club
 * (an officer is a school account that owns a club). `recruiter`: any email plus a company.
 */
export type AccountType = "school" | "recruiter";

/** A US university from `searchSchools`. `domains` are the email domains it accepts; the first is primary. */
export type School = { name: string; domains: string[] };

/** A school as attached to a resume. `domain` is the primary email domain and the filter value. */
export type SchoolRef = { name: string; domain: string };

/** The signed-in user, or `null` when logged out. */
export type Viewer = {
  id: string;
  email: string;
  /** `null` when signup was interrupted before `createAccount`; pages send the user to /signup. */
  accountType: AccountType | null;
  /** School accounts only. */
  school: School | null;
  /** Recruiters only; `null` until they finish setup. */
  company: string | null;
  /** The club this school account runs, if any. */
  ownedClub: ClubSummary | null;
  /** Whether this school account has a resume in at least one book. */
  hasResume: boolean;
  /** `false` until the setup flow is finished; pages send the user to /setup. */
  onboarded: boolean;
  /** Recruiters: how many resumes they can currently open. Drives the header counter. */
  unlockedCount: number;
};

/* ------------------------------------------------------------------ */
/* Clubs and books                                                     */
/* ------------------------------------------------------------------ */

export type ClubSummary = {
  id: string;
  slug: string;
  name: string;
  /** Short line under the name, e.g. "Electrical & computer engineering honor society". */
  tagline: string | null;
  school: string;
  hue: Hue;
};

/** Each club has exactly one book, created with the club. */
export type BookSummary = {
  id: string;
  club: ClubSummary;
  /** Accepted, non-withdrawn resumes. */
  resumeCount: number;
};

/* ------------------------------------------------------------------ */
/* Resumes                                                             */
/* ------------------------------------------------------------------ */

/**
 * A resume as a viewer sees it. Each student has one resume, which can be in many books.
 *
 * Before unlock, `contact` is `null` and the UI renders a redacted document built from
 * `profile`. After unlock, `contact` is filled in and the original PDF is served by
 * `GET /api/resumes/{id}/pdf` (checks access, then redirects to a presigned S3 URL).
 */
export type ResumeView = {
  id: string;
  school: SchoolRef;
  /** Books this resume was accepted into. Never empty for resumes shown to recruiters. */
  books: BookRef[];
  profile: ResumeProfile;
  contact: Contact | null;
  createdAt: string; // ISO 8601
};

export type BookRef = { id: string; club: ClubSummary };

export type ResumeSort = "grad-year" | "newest";

/**
 * Browse filters. Each maps to one URL search param, so filtered views are shareable.
 * Any-of within a filter, except `skills`, where a resume must have every chosen skill.
 */
export type ResumeFilters = {
  q: string;
  schools: string[]; // primary email domains, e.g. "psu.edu"
  gradYears: number[];
  seeking: Seeking[];
  majors: string[];
  skills: string[];
  clubs: string[]; // club slugs
  /** Recruiters only: show just the resumes they have unlocked. */
  unlockedOnly: boolean;
  sort: ResumeSort;
};

export type FacetOption = { value: string; label: string; count: number };

/** Filter rail options, from values that exist in the data, with counts over all visible resumes. */
export type ResumeFacets = {
  schools: FacetOption[];
  gradYears: FacetOption[];
  seeking: FacetOption[];
  majors: FacetOption[];
  skills: FacetOption[];
  clubs: (FacetOption & { hue: Hue })[];
};

/** Browse is for signed-in recruiters only; other viewers never get a page. */
export type ResumePage = {
  items: ResumeView[];
  /** Total matches for the current filters, across all pages. */
  total: number;
  /** Opaque cursor for the next page, or `null` on the last page. */
  nextCursor: string | null;
};

/* ------------------------------------------------------------------ */
/* Unlocking                                                           */
/* ------------------------------------------------------------------ */

/** What a purchase covers: one resume, or every accepted resume in one club's book. */
export type OfferKind = "resume" | "book";

export type UnlockOffer = {
  /** Stable id to send back to `unlockResume`, e.g. "resume" or "book:book_hkn". */
  key: string;
  kind: OfferKind;
  /** The book this offer opens; `null` for a single resume. */
  book: BookSummary | null;
  /** Clubs that get paid. A single resume pays every club whose book it's in. */
  beneficiaries: ClubSummary[];
  /** What the recruiter pays today. `0` means it is covered by their plan. */
  priceCents: number;
  /** The clubs' combined share of `priceCents`. The rest is the platform fee. */
  clubPayoutCents: number;
  /** Number of resumes this offer opens. */
  resumeCount: number;
};

export type UnlockQuote = {
  resume: ResumeView;
  /** In display order. The UI preselects the one whose key is `recommended`. */
  offers: UnlockOffer[];
  recommended: string;
};

export type UnlockResult =
  | { status: "unlocked"; offer: UnlockOffer; contact: Contact }
  /** Payment needs a hosted checkout (e.g. App Monetization). The UI navigates to `url`. */
  | { status: "checkout"; url: string }
  | { status: "error"; message: string };

/* ------------------------------------------------------------------ */
/* Signup                                                              */
/* ------------------------------------------------------------------ */

/**
 * Called right after Cognito reports the user is authenticated on /signup. The server
 * checks that a school account's verified email is on one of the school's domains, then
 * creates the user row with `onboarded = false`.
 */
export type CreateAccountInput = { accountType: "school"; schoolDomain: string } | { accountType: "recruiter" };

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

/**
 * A school account saves its one resume and requests to join books at its school.
 * Each request starts `pending`; the club's officer accepts or rejects it.
 */
export type ResumeSubmission = {
  bookIds: string[];
  uploadId: string;
  /** Name as it should appear once unlocked. The email is the account's verified email. */
  name: string;
  profile: ResumeProfile;
  /** The student ticked the consent checkbox. The backend stores `consented_at`. */
  consent: true;
};

/** A school account creates its club. The club's single book is created with it. */
export type ClubInput = {
  name: string;
  tagline: string | null;
  hue: Hue;
  /** Where the club wants its earnings sent. Payouts are manual for now. */
  payoutEmail: string;
};

export type ClubCreated = {
  club: ClubSummary;
  bookId: string;
  /** Absolute URL members open to request to join the book (requires sign-in). */
  joinUrl: string;
};

export type MembershipStatus = "pending" | "accepted" | "rejected";

export type RecruiterSetupInput = {
  company: string;
  jobTitle: string | null;
  /** Saved as the recruiter's default browse filters. */
  hiring: { seeking: Seeking[]; gradYears: number[]; majors: string[] };
};

/** Result of uploading one PDF. `parsed` is `null` when parsing failed; the UI asks for manual entry. */
export type UploadResult =
  | { status: "ok"; uploadId: string; parsed: ParsedResume | null }
  | { status: "error"; message: string };
