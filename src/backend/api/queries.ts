import "server-only";

import { getClubDashboard as getClubDashboardAt } from "@/backend/clubs";

import { getOrigin } from "./request";
import type { ClubDashboard } from "./types";

/**
 * Reads for server components. Each checks the session itself and throws for viewers it doesn't
 * serve (browse reads need any signed-in account, unlock quotes need a company), so pages check
 * `getViewer()` first and redirect.
 */

export { getClubBySlug, listOpenBooks } from "@/backend/clubs";
export { getCheckout } from "@/backend/billing";
export {
  getResume,
  getResumeFacets,
  getResumePdfUrl,
  getResumePreviewUrl,
  getStudentHome,
  getUnlockQuote,
  listResumes,
} from "@/backend/resumes";
export { getViewer } from "./viewer";

/** The viewer's club with requests, members, and sales, or `null` if they don't run one. */
export async function getClubDashboard(): Promise<ClubDashboard | null> {
  return getClubDashboardAt(await getOrigin());
}
