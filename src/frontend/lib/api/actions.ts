/**
 * Server actions client components call directly. Mutations return an `ActionResult`
 * instead of throwing, because Next hides thrown messages in production.
 */

export {
  completeRecruiterSetup,
  createAccount,
  createClub,
  decideJoinRequest,
  deleteResume,
  finishSetup,
  leaveBook,
  loadMoreResumes,
  previewRedaction,
  requestBooks,
  searchSchools,
  submitResume,
  unlockBook,
  updateBookPrice,
  uploadResume,
} from "@/backend/api/actions";
