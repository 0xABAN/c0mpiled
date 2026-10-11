import "server-only";

import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { cookies } from "next/headers";

import { amplifyConfig } from "./config";

/** The signed-in Cognito user, as proven by a verified ID token. */
export type AuthSession = {
  /** Cognito `sub`; also `users.id`. */
  userId: string;
  email: string;
  emailVerified: boolean;
};

const { runWithAmplifyServerContext } = createServerRunner({ config: amplifyConfig });

/**
 * Reads the Cognito session from the request cookies, or `null` when signed out.
 *
 * The Amplify adapter verifies each token's signature, issuer, and client before using it, and
 * refreshes expired tokens, so the claims here can be trusted.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (contextSpec) => fetchAuthSession(contextSpec),
  });

  const claims = session.tokens?.idToken?.payload;
  if (!claims || typeof claims.sub !== "string" || typeof claims.email !== "string") return null;

  return {
    userId: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
  };
}
