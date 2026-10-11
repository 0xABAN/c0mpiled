import { z } from "zod";
import { DEMO_ACCOUNTS } from "@/backend/demo/accounts";

/** Shared or invented identities must never start real payments. */
export function isDemoBuyer(account: { id: string; email: string }): boolean {
  return /^(seed|demo):/.test(account.id) || Object.values(DEMO_ACCOUNTS).some((email) => email === account.email.toLowerCase());
}

/** The explicit ARN selects the environment; never infer or fall back between test and live. */
export function providerConfig(appArn: string | undefined, endpoint: string | undefined) {
  const match = /^arn:aws:appmonetization:([a-z0-9-]+):\d{12}:apps\/([a-zA-Z0-9_-]+)(\/sandbox)?$/.exec(appArn ?? "");
  if (!match || !endpoint) throw new Error("Billing requires MONETIZATION_APP_ID and MONETIZATION_ENDPOINT.");

  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("The monetization endpoint must be an HTTPS origin.");
  }

  if (url.hostname !== `${match[1]}.alpha.monetization.aws.dev` || url.port || match[2].endsWith("-shadow")) {
    throw new Error("The app ARN and supported provider endpoint must identify the same region.");
  }
  return { appArn: appArn!, appId: match[2], region: match[1], endpoint: url.origin, mode: match[3] ? "sandbox" as const : "live" as const };
}

/** The provider shares its catalog across live/sandbox, but not buyer entitlements. */
export function sameBillingApp(left: string, right: string): boolean {
  return left.replace(/\/sandbox$/, "") === right.replace(/\/sandbox$/, "");
}

/**
 * A free quota, subscription, unknown reason, or another book's metric is not proof of purchase.
 * The beta's actual purchased-unit reason is newer than its SDK's declared reason-code enum.
 */
export function hasPaidBookUnit(response: unknown, metricId: string): boolean {
  const parsed = z.object({
    decision: z.literal("ALLOW"),
    reason: z.object({ category: z.literal("USAGE"), code: z.literal("COVERED_BY_PURCHASED_UNITS") }),
    metrics: z.array(z.object({
      metricCode: z.literal(metricId),
      remaining: z.number().finite().min(1),
    })).length(1),
  }).safeParse(response);

  return parsed.success;
}

/** Only return to this app's browse screen, retaining its filters and selected resume. */
export function browseReturnPath(raw: string): string {
  const url = new URL(raw, "https://roster.invalid");
  if (url.origin !== "https://roster.invalid" || url.pathname !== "/browse" || url.hash || !raw.startsWith("/browse")) {
    throw new Error("Checkout must return to the browse screen.");
  }
  return `${url.pathname}${url.search}`;
}

/** A checkout URL must belong to the exact configured payment environment. */
export function providerCheckoutUrl(raw: string, mode: "sandbox" | "live"): string {
  const url = new URL(raw);
  const host = mode === "sandbox" ? "us-east-1.sandbox.payments.monetization.aws.dev" : "us-east-1.payments.monetization.aws.dev";
  if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password) {
    throw new Error("The provider returned a checkout URL for the wrong environment.");
  }
  return raw;
}

export function dollarAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
