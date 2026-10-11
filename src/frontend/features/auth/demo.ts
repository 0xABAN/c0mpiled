import { DEMO_ACCOUNTS, type DemoRole } from "@/backend/demo/accounts";

/** Whether an email belongs to one of the shared demo accounts. */
export function isDemoAccount(email: string): boolean {
  return Object.values(DEMO_ACCOUNTS).includes(email as (typeof DEMO_ACCOUNTS)[DemoRole]);
}
