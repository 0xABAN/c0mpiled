/**
 * Server-side reads for pages. This file and `./actions.ts` are the only places the UI
 * touches the backend. Today both delegate to `./mock`; swapping in the real
 * implementation should not require changes to any page or component.
 */

export {
  /** The signed-in user, or `null` when logged out. */
  getViewer,
  /** One page of browse results. Pass the previous page's `nextCursor` for the next one. */
  listResumes,
  /** Filter rail options with counts. */
  getResumeFacets,
  /** A single resume. `contact` is `null` unless the viewer has unlocked it. */
  getResume,
  /** Books that students can join during setup. */
  listOpenBooks,
  /** Prices and payout split for unlocking a resume, or `null` if it doesn't exist. */
  getUnlockQuote,
} from "./mock/api";

export type * from "./types";
