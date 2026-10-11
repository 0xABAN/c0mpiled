/**
 * Who is making the request. Sign-in, sign-up, and sign-out happen in the browser through
 * Amplify; the server only reads the resulting session. Accounts (`users` rows) live in
 * `@/backend/accounts`.
 */
export { getAuthSession, type AuthSession } from "./session";
