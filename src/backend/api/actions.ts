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

/*
 * Not built yet. Uploads need S3 and the parser (the teammate's `@/backend/parsing`), and
 * purchases need billing (`@/backend/billing`). Each says so instead of pretending to work.
 */

export async function uploadResume(formData: FormData): Promise<UploadResult> {
  void formData;
  return { status: "error", message: "Resume uploads aren't open yet." };
}

export async function submitResume(submission: ResumeSubmission): Promise<ActionResult> {
  void submission;
  return { status: "error", message: "Resume uploads aren't open yet." };
}

export async function unlockBook(bookId: string, resumeId: string): Promise<UnlockResult> {
  void bookId;
  void resumeId;
  return { status: "error", message: "Book purchases aren't open yet." };
}
