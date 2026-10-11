import type { ResourcesConfig } from "aws-amplify";

/**
 * Amplify configuration for the Cognito user pool, shared by the browser (`<Authenticator>`)
 * and the server (session checks), so both read the same cookies.
 *
 * This is the one backend module that client code may import: it only reads public
 * `NEXT_PUBLIC_*` env vars. Those are inlined at build time, so they must be referenced
 * literally rather than through a helper.
 */
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: requirePublicEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID", process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID),
      userPoolClientId: requirePublicEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID),
      loginWith: { email: true },
      signUpVerificationMethod: "code",
    },
  },
};

function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. See AGENTS.md for the env vars.`);
  return value;
}
