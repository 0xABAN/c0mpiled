import "server-only";

import { getClubDashboard as getClubDashboardAt } from "@/backend/clubs";

import { getOrigin } from "./request";
import type { ClubDashboard } from "./types";

/**
 * Reads for server components. Each checks the session itself; recruiter-only reads throw
 * for anyone else, so pages check `getViewer()` first and redirect.
 */

export { getClubBySlug, listOpenBooks } from "@/backend/clubs";
export { getResume, getResumeFacets, getUnlockQuote, listResumes } from "@/backend/resumes";
export { getViewer } from "./viewer";

/** The viewer's club with requests, members, and sales, or `null` if they don't run one. */
export async function getClubDashboard(): Promise<ClubDashboard | null> {
  return getClubDashboardAt(await getOrigin());
}
