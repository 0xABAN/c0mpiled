"use server";

/**
 * Mutations (and the reads that client components need) as server actions, so the real
 * implementation can check the session and talk to Postgres, S3, and billing without the
 * browser seeing credentials.
 *
 * Mock implementations for now; see `./index.ts`.
 */

import { redirect } from "next/navigation";

import { findMockResume, listResumes, quoteOffers, searchSchools as searchMockSchools } from "./mock/api";
import { SCHOOLS } from "./mock/fixtures";
import { EMPTY_ACCOUNT, readSession, readUnlocks, updateSession, writeSession, writeUnlocks } from "./mock/session";
import type {
  CreateAccountInput,
  ClubCreated,
  ClubInput,
  RecruiterSetupInput,
  ResumeFilters,
  ResumePage,
  ResumeSubmission,
  School,
  UnlockResult,
  UploadResult,
} from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Create the user row right after Cognito signup. See `CreateAccountInput`. */
export async function createAccount(input: CreateAccountInput): Promise<void> {
  const session = await readSession();
  const email = session?.email ?? "new.user@psu.edu";

  if (input.accountType === "school") {
    const school = SCHOOLS.find((candidate) => candidate.domains.includes(input.schoolDomain)) ?? null;
    if (!school || !school.domains.some((domain) => email.endsWith(`@${domain}`))) throw new Error("Use your school email to sign up.");
    await writeSession({ ...EMPTY_ACCOUNT, email, accountType: "school", school });
  } else {
    await writeSession({ ...EMPTY_ACCOUNT, email, accountType: "recruiter" });
  }
}

/** Next page of browse results, for infinite scroll. */
export async function loadMoreResumes(filters: ResumeFilters, cursor: string): Promise<ResumePage> {
  return listResumes(filters, cursor);
}

/** Typeahead over US universities, for the school step of signup. */
export async function searchSchools(query: string): Promise<School[]> {
  return searchMockSchools(query);
}

/**
 * Unlock a resume for the signed-in recruiter, using one of the offers from its quote.
 * Real implementation: `canUnlock` → insert `unlocks` row → `recordUnlock` (AGENTS.md).
 */
export async function unlockResume(resumeId: string, offerKey: string): Promise<UnlockResult> {
  await wait(900);

  const session = await readSession();
  if (session?.accountType !== "recruiter") return { status: "error", message: "Only company accounts can unlock resumes." };

  const resume = findMockResume(resumeId);
  const offer = resume && quoteOffers(resume).find((candidate) => candidate.key === offerKey);
  if (!resume || !offer) return { status: "error", message: "This resume is no longer available." };

  const unlocks = await readUnlocks();
  if (offer.book) unlocks.bookIds.push(offer.book.id);
  else unlocks.resumeIds.push(resume.id);
  await writeUnlocks(unlocks);

  return { status: "unlocked", offer, contact: resume.contact };
}

/**
 * Upload one resume PDF (form field `file`, at most 5 MB) and parse it.
 * The upload is attached to books later, by `submitResume`.
 */
export async function uploadResume(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") return { status: "error", message: "That file isn't a PDF." };
  if (file.size > 5 * 1024 * 1024) return { status: "error", message: "PDFs must be 5 MB or smaller." };

  await wait(2600);

  // Pretend the parser read a typical sophomore CS resume.
  return {
    status: "ok",
    uploadId: `upload_${Date.now()}`,
    parsed: {
      contact: { name: "Jordan Lee", email: null },
      profile: {
        gradYear: 2028,
        majors: ["Computer Science"],
        degree: "BS",
        seeking: ["internship"],
        skills: ["Python", "TypeScript", "React", "PostgreSQL", "AWS", "Git"],
        experience: [
          { title: "Software Engineering Intern", org: "Vanguard" },
          { title: "Undergraduate Researcher", org: "Penn State ARL" },
        ],
      },
    },
  };
}

/** Add the uploaded resume to the chosen books. Requires a school account. */
export async function submitResume(submission: ResumeSubmission): Promise<void> {
  void submission;
  await wait(700);
  await updateSession({ hasResume: true });
}

/** Create the viewer's club and its book. Requires a school account. */
export async function createClub(input: ClubInput): Promise<ClubCreated> {
  await wait(700);

  const session = await readSession();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const club = { id: `club_${slug}`, slug, name: input.name, tagline: input.tagline, school: session?.school?.name ?? "Penn State", hue: input.hue };

  await updateSession({ ownedClub: club });

  return { club, bookId: `book_${slug}`, joinUrl: `https://roster.example/join/${slug}` };
}

/** Mark onboarding as finished. School accounts call this after their last step. */
export async function finishSetup(): Promise<void> {
  await updateSession({ onboarded: true });
}

export async function completeRecruiterSetup(input: RecruiterSetupInput): Promise<void> {
  await wait(700);
  await updateSession({ company: input.company, onboarded: true });
}

export async function signOut(): Promise<void> {
  await writeSession(null);
  redirect("/login");
}
