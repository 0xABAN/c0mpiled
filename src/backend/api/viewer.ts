import "server-only";

import { getCurrentAccount } from "@/backend/accounts";
import { findOwnedClub, toClubSummary } from "@/backend/clubs";
import { countUnlockedResumes, hasSubmittedResume } from "@/backend/resumes";
import { findSchool } from "@/backend/schools";

import type { Viewer } from "./types";

/** The signed-in user as pages see them, or `null` when signed out. */
export async function getViewer(): Promise<Viewer | null> {
  const current = await getCurrentAccount();
  if (!current) return null;

  const { session, account } = current;

  // Signed up with Cognito but never picked school or recruiter: pages send them to /signup.
  if (!account) {
    return {
      id: session.userId,
      email: session.email,
      accountType: null,
      school: null,
      company: null,
      ownedClub: null,
      hasResume: false,
      onboarded: false,
      unlockedCount: 0,
    };
  }

  const isSchool = account.accountType === "school";

  const [owned, hasResume, unlockedCount] = await Promise.all([
    isSchool ? findOwnedClub(account.id) : null,
    isSchool ? hasSubmittedResume(account.id) : false,
    isSchool ? 0 : countUnlockedResumes(account.id),
  ]);

  return {
    id: account.id,
    email: account.email,
    accountType: account.accountType,
    school: account.schoolDomain ? findSchool(account.schoolDomain) : null,
    company: account.company,
    ownedClub: owned ? toClubSummary(owned.club) : null,
    hasResume,
    onboarded: account.onboardedAt !== null,
    unlockedCount,
  };
}
