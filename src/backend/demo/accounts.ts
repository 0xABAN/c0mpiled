/**
 * Shared demo logins, so judges and visitors can try the officer and student sides without
 * signing up. `npm run demo:reset` creates them and restores their data.
 *
 * Client code may import this module: the password is deliberately public (anyone can use the
 * demo), and it's inlined from `NEXT_PUBLIC_DEMO_PASSWORD` at build time.
 */
export const DEMO_ACCOUNTS = {
  /** Runs "Demo Club", which has members, pending requests, and two sales. */
  officer: "demo.officer@psu.edu",
  /** Has a resume with redacted previews, accepted into Demo Club and pending at Demo Robotics. */
  student: "demo.student@psu.edu",
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export function demoPassword(): string {
  const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
  if (!password) throw new Error("NEXT_PUBLIC_DEMO_PASSWORD is not set. See AGENTS.md for the env vars.");
  return password;
}
