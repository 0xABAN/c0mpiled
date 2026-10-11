/**
 * A failure the user can fix or should be told about, with a message that is safe to show.
 *
 * Feature modules throw it; server actions in `@/backend/api` turn it into an error result.
 * Next.js replaces the message of any other error thrown from a server action with a generic
 * one in production, so anything meant for the user must be a `UserError`.
 */
export class UserError extends Error {
  override name = "UserError";
}
