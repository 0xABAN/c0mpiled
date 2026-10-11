/**
 * Shared demo logins, one per kind of account, so judges and visitors can try Roster without
 * signing up. `npm run demo:reset` creates them and restores their data.
 *
 * Client code may import this module: the password is deliberately public (anyone can use the
 * demo), and it's inlined from `NEXT_PUBLIC_DEMO_PASSWORD` at build time.
 */
export const DEMO_ACCOUNTS = {
  /**
   * A school account that shows both sides of being a student: Riley's resume is accepted into
   * Demo Club and pending at Demo Robotics, and Riley also runs Demo Club (members, requests, sales).
   */
  student: "demo.student@psu.edu",
  /** A recruiter at "Demo Co" who has bought Demo Club's book, so browse shows unlocked resumes too. */
  company: "demo.company@example.com",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export function demoPassword(): string {
  const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
  if (!password) throw new Error("NEXT_PUBLIC_DEMO_PASSWORD is not set. See AGENTS.md for the env vars.");
  return password;
}
