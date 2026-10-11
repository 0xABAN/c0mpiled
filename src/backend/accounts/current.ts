import "server-only";

import { eq } from "drizzle-orm";

import { getAuthSession, type AuthSession } from "@/backend/auth";
import { db, users } from "@/backend/db";
import { UserError } from "@/backend/errors";

export type Account = typeof users.$inferSelect;
export type AccountType = Account["accountType"];

/**
 * The Cognito session and the matching `users` row. `account` is `null` when the user signed
 * up but hasn't picked school or recruiter yet.
 */
export async function getCurrentAccount(): Promise<{ session: AuthSession; account: Account | null } | null> {
  const session = await getAuthSession();
  if (!session) return null;

  const account = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  return { session, account: account ?? null };
}

/** The signed-in account, optionally of one type. Throws a `UserError` otherwise. */
export async function requireAccount<Type extends AccountType>(
  accountType?: Type,
): Promise<Account & { accountType: Type }> {
  const current = await getCurrentAccount();
  if (!current) throw new UserError("Sign in first.");
  if (!current.account) throw new UserError("Finish creating your account first.");

  if (accountType && current.account.accountType !== accountType) {
    throw new UserError(accountType === "school" ? "This needs a school account." : "This needs a company account.");
  }

  return current.account as Account & { accountType: Type };
}
