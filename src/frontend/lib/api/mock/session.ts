import { cookies } from "next/headers";

import type { Viewer } from "../types";

/**
 * Stand-in for the Cognito session while the backend is being built. It lives in two
 * cookies so state survives dev-server reloads. Deleted when the real API lands.
 */

const SESSION_COOKIE = "roster_mock_session";
const UNLOCKS_COOKIE = "roster_mock_unlocks";

export type MockSession = Omit<Viewer, "id" | "unlockedCount">;

export type MockUnlocks = { resumeIds: string[]; bookIds: string[] };

/** A freshly authenticated user before setup. */
export const EMPTY_ACCOUNT: MockSession = {
  email: "",
  accountType: null,
  school: null,
  company: null,
  ownedClub: null,
  hasResume: false,
  onboarded: false,
};

export async function readSession(): Promise<MockSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return raw ? (JSON.parse(raw) as MockSession) : null;
}

export async function writeSession(session: MockSession | null) {
  const jar = await cookies();

  if (session) {
    jar.set(SESSION_COOKIE, JSON.stringify(session), { path: "/", httpOnly: true, sameSite: "lax" });
  } else {
    jar.delete(SESSION_COOKIE);
    jar.delete(UNLOCKS_COOKIE);
  }
}

export async function updateSession(patch: Partial<MockSession>) {
  const session = await readSession();
  if (session) await writeSession({ ...session, ...patch });
}

export async function readUnlocks(): Promise<MockUnlocks> {
  const raw = (await cookies()).get(UNLOCKS_COOKIE)?.value;
  return raw ? (JSON.parse(raw) as MockUnlocks) : { resumeIds: [], bookIds: [] };
}

export async function writeUnlocks(unlocks: MockUnlocks) {
  (await cookies()).set(UNLOCKS_COOKIE, JSON.stringify(unlocks), { path: "/", httpOnly: true, sameSite: "lax" });
}
