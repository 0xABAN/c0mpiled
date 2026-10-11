import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getAuthSession } from "@/backend/auth";
import { db, users } from "@/backend/db";
import { UserError } from "@/backend/errors";
import { findSchool, isSchoolEmail, primaryDomain } from "@/backend/schools";
import { parseInput } from "@/backend/validation";

import { requireAccount } from "./current";

const createAccountInput = z.discriminatedUnion("accountType", [
  z.object({ accountType: z.literal("school"), schoolDomain: z.string().trim().toLowerCase().min(1) }),
  z.object({ accountType: z.literal("recruiter") }),
]);

/**
 * Creates the `users` row right after Cognito signup.
 *
 * A school account's verified email must be on one of the school's domains. That check is
 * what makes "school account" mean "really a student or officer at this school". Calling it
 * again with the same choice is a no-op, so the signup page can safely retry.
 */
export async function createAccount(rawInput: unknown): Promise<void> {
  const input = parseInput(createAccountInput, rawInput);

  const session = await getAuthSession();
  if (!session) throw new UserError("Sign in first.");
  if (!session.emailVerified) throw new UserError("Verify your email first.");

  let schoolDomain: string | null = null;

  if (input.accountType === "school") {
    const school = findSchool(input.schoolDomain);
    if (!school) throw new UserError("We don't recognize that school.");

    if (!isSchoolEmail(session.email, school)) {
      throw new UserError(`Sign up with your @${primaryDomain(school)} email to join as ${school.name}.`);
    }

    schoolDomain = primaryDomain(school);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.id, session.userId) });

  if (existing) {
    if (existing.accountType === input.accountType && existing.schoolDomain === schoolDomain) return;
    throw new UserError("This email already has an account of a different type.");
  }

  await db.insert(users).values({
    id: session.userId,
    email: session.email,
    accountType: input.accountType,
    schoolDomain,
  });
}

const recruiterSetupInput = z.object({
  company: z.string().trim().min(1, "Enter your company.").max(120),
  jobTitle: z.string().trim().max(120).nullable().transform((title) => title || null),
  hiring: z.object({
    seeking: z.array(z.enum(["internship", "full-time"])).max(2),
    gradYears: z.array(z.int().min(2000).max(2100)).max(10),
    majors: z.array(z.string().trim().min(1).max(80)).max(20),
  }),
});

/** Saves a recruiter's company and hiring defaults, and finishes their setup. */
export async function completeRecruiterSetup(rawInput: unknown): Promise<void> {
  const input = parseInput(recruiterSetupInput, rawInput);
  const account = await requireAccount("recruiter");

  await db
    .update(users)
    .set({ company: input.company, jobTitle: input.jobTitle, hiring: input.hiring, onboardedAt: new Date() })
    .where(eq(users.id, account.id));
}

/** Marks a school account's setup as finished. */
export async function finishSetup(): Promise<void> {
  const account = await requireAccount("school");

  await db
    .update(users)
    .set({ onboardedAt: new Date() })
    .where(and(eq(users.id, account.id), isNull(users.onboardedAt)));
}
