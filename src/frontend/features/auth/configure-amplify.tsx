"use client";

import { Amplify } from "aws-amplify";

import { amplifyConfig } from "@/backend/auth/config";

// `ssr: true` keeps tokens in cookies so server components can read the session.
Amplify.configure(amplifyConfig, { ssr: true });

/** Render once on any page that uses Amplify in the browser. Configuration runs on import. */
export function ConfigureAmplify() {
  return null;
}
