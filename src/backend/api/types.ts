/**
 * Types the UI receives from the backend.
 *
 * These are view models: the exact shape a page needs, so the backend can assemble it with
 * joins and the UI never sees table rows. The UI imports them through `@/frontend/lib/api`.
 */

import type { ParsedResume, ResumeProfile, Seeking } from "@/backend/parsing/types";
import type { School } from "@/backend/schools";

/* ------------------------------------------------------------------ */
/* Contract 1: parser output                                           */
/* ------------------------------------------------------------------ */

export type { ParsedResume, ResumeProfile, Seeking } from "@/backend/parsing/types";

export type Degree = ResumeProfile["degree"];
export type Contact = ParsedResume["contact"];

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/**
 * What a server action returns. `message` is safe to show the user. Actions return errors
 * instead of throwing because Next.js hides thrown messages in production builds.
 */
export type ActionResult<T = null> = { status: "ok"; data: T } | { status: "error"; message: string };

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
export type { School };

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
  /** What a company pays to unlock the whole book. Set by the club. */
  priceCents: number;
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
  /**
   * Redacted pages (Contract 3) at `/api/resumes/{id}/preview/{n}`, n = 1..previewPageCount.
   * 0 when there are none (seed data); the UI then draws the document from `profile`.
   */
  previewPageCount: number;
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

/**
 * Companies unlock a club's entire book at the price the club sets. A resume in several
 * books gets one offer per book; unlocking any of them reveals it.
 */
export type UnlockOffer = {
  book: BookSummary;
  /** `book.priceCents`, or `0` if covered by the recruiter's plan. */
  priceCents: number;
  /** The club's share of `priceCents`. The split is not decided yet; mocked for now. */
  clubPayoutCents: number;
};

export type UnlockQuote = {
  resume: ResumeView;
  /** In display order, one per book the resume is in. */
  offers: UnlockOffer[];
  /** Book id the UI preselects. */
  recommendedBookId: string;
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
  /** Price of the club's book, editable later on /dashboard. */
  priceCents: number;
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

/* ------------------------------------------------------------------ */
/* Student home                                                        */
/* ------------------------------------------------------------------ */

/** A school account's resume and where it stands in each book it asked to join. */
export type StudentHome = {
  /** `null` until the student submits a resume. */
  resume: { id: string; name: string; profile: ResumeProfile; previewPageCount: number; updatedAt: string } | null;
  /** Every book the student asked to join, newest request first, including rejections. */
  memberships: { book: BookSummary; status: MembershipStatus; requestedAt: string }[];
};

/* ------------------------------------------------------------------ */
/* Club dashboard                                                      */
/* ------------------------------------------------------------------ */

/**
 * A student's request to join the book, or an accepted member. Not redacted: the officer
 * is checking that these are real members.
 */
export type Membership = {
  resumeId: string;
  name: string;
  /** Verified school email. */
  email: string;
  profile: ResumeProfile;
  /** Redacted pages, as on `ResumeView`, so officers can check a request. */
  previewPageCount: number;
  status: MembershipStatus;
  requestedAt: string; // ISO 8601
};

export type BookUnlock = {
  company: string;
  amountCents: number;
  unlockedAt: string; // ISO 8601
};

/** Everything /dashboard shows for the viewer's club. `null` if they don't run one. */
export type ClubDashboard = {
  club: ClubSummary;
  book: BookSummary;
  joinUrl: string;
  /** Pending first, oldest first; then accepted, newest first. Rejected requests are omitted. */
  memberships: Membership[];
  unlocks: BookUnlock[];
  /** Sum of what companies paid for the book. */
  earnedCents: number;
};
