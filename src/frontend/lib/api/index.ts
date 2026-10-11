/**
 * Server-side reads for pages. This file and `./actions.ts` are the only places the UI
 * touches the backend. Recruiter-only reads throw for anyone else, so pages check
 * `getViewer()` first and redirect.
 */

export {
  getClubDashboard,
  getResume,
  getResumeFacets,
  getUnlockQuote,
  getViewer,
  listOpenBooks,
  listResumes,
} from "@/backend/api/queries";

export type * from "./types";
