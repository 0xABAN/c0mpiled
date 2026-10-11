import "server-only";

import { headers } from "next/headers";

import { UserError } from "@/backend/errors";

import type { ActionResult } from "./types";

/**
 * The site's origin for absolute links, e.g. join links officers paste into group chats.
 * Behind Amplify's CDN the public host arrives in the `x-forwarded-*` headers.
 */
export async function getOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("The request has no Host header.");

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/** Runs a mutation and turns a `UserError` into an error result. Other errors still throw. */
export async function runAction<T>(mutation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { status: "ok", data: await mutation() };
  } catch (error) {
    if (error instanceof UserError) return { status: "error", message: error.message };
    throw error;
  }
}
