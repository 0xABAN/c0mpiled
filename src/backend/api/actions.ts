"use server";

/**
 * Server actions: everything the browser can call. Arguments arrive untyped from the network,
 * so every feature function validates its own input. Mutations return an `ActionResult`.
 */

import { z } from "zod";

import * as accounts from "@/backend/accounts";
import * as clubs from "@/backend/clubs";
import * as resumes from "@/backend/resumes";
import { searchSchools as searchSchoolDirectory } from "@/backend/schools";
import { parseInput } from "@/backend/validation";

import { getOrigin, runAction } from "./request";
import type {
  ActionResult,
  ClubCreated,
  CreateAccountInput,
  ResumeFilters,
  ResumePage,
  ResumeSubmission,
  School,
  UnlockResult,
  UploadResult,
} from "./types";

/** Next page of browse results, for infinite scroll. Recruiters only. */
export async function loadMoreResumes(filters: ResumeFilters, cursor: string): Promise<ResumePage> {
  return resumes.listResumes(filters, cursor);
}

/** Typeahead over US schools, for the school step of signup. Open to signed-out visitors. */
export async function searchSchools(query: string): Promise<School[]> {
  return searchSchoolDirectory(parseInput(z.string().max(100), query));
}

/** Right after Cognito signup: creates the account as a school account or a recruiter. */
export async function createAccount(input: CreateAccountInput): Promise<ActionResult> {
  return runAction(async () => {
    await accounts.createAccount(input);
    return null;
  });
}

export async function completeRecruiterSetup(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await accounts.completeRecruiterSetup(input);
    return null;
  });
}

/** Marks a school account's setup as finished. */
export async function finishSetup(): Promise<ActionResult> {
  return runAction(async () => {
    await accounts.finishSetup();
    return null;
  });
}

/** Creates the viewer's club and its book. */
export async function createClub(input: unknown): Promise<ActionResult<ClubCreated>> {
  return runAction(async () => clubs.createClub(input, await getOrigin()));
}

/** Officer decision on a join request. Only accepted members are shown to recruiters. */
export async function decideJoinRequest(resumeId: string, decision: "accepted" | "rejected"): Promise<ActionResult> {
  return runAction(async () => {
    await clubs.decideJoinRequest(resumeId, decision);
    return null;
  });
}

/** Changes the price of the viewer's club book. */
export async function updateBookPrice(priceCents: number): Promise<ActionResult> {
  return runAction(async () => {
    await clubs.updateBookPrice(priceCents);
    return null;
  });
}

/**
 * Stores one resume PDF (form field `file`, at most 5 MB) for a school account. `parsed` is
 * `null` until the parser exists, so the student fills in the profile by hand.
 */
export async function uploadResume(formData: FormData): Promise<UploadResult> {
  const result = await runAction(() => resumes.uploadResume(formData));
  return result.status === "ok" ? { status: "ok", ...result.data } : result;
}

/** Saves the student's resume and requests to join the chosen books at their school. */
export async function submitResume(submission: ResumeSubmission): Promise<ActionResult> {
  return runAction(async () => {
    await resumes.submitResume(submission);
    return null;
  });
}

/** Adds the student's existing resume to more books at their school. */
export async function requestBooks(input: { bookIds: string[]; consent: true }): Promise<ActionResult> {
  return runAction(async () => {
    await resumes.requestBooks(input);
    return null;
  });
}

/** Takes the student's resume out of one book, or withdraws a pending request. */
export async function leaveBook(bookId: string): Promise<ActionResult> {
  return runAction(async () => {
    await resumes.leaveBook(bookId);
    return null;
  });
}

/** Deletes the student's resume, its PDF, and every book membership. */
export async function deleteResume(): Promise<ActionResult> {
  return runAction(async () => {
    await resumes.deleteResume();
    return null;
  });
}

/** Not built yet: purchases need billing (`@/backend/billing`), so this says so instead of pretending. */
export async function unlockBook(bookId: string, resumeId: string): Promise<UnlockResult> {
  void bookId;
  void resumeId;
  return { status: "error", message: "Book purchases aren't open yet." };
}
