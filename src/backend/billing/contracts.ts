import { z } from "zod";

/** This integration is evaluation-only. A live ARN is a configuration error, never a fallback. */
export function sandboxConfig(appArn: string | undefined, endpoint: string | undefined) {
  const match = /^arn:aws:appmonetization:([a-z0-9-]+):\d{12}:apps\/([a-zA-Z0-9_-]+)\/sandbox$/.exec(appArn ?? "");
  if (!match || !endpoint) throw new Error("Sandbox billing requires MONETIZATION_APP_ID and MONETIZATION_ENDPOINT.");

  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("The monetization endpoint must be an HTTPS origin.");
  }

  if (url.hostname !== `${match[1]}.alpha.monetization.aws.dev` || url.port || match[2].endsWith("-shadow")) {
    throw new Error("The sandbox ARN and supported provider endpoint must identify the same region.");
  }
  return { appArn: appArn!, appId: match[2], region: match[1], endpoint: url.origin };
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

/** Accept only the provider's test checkout host, never a live or caller-supplied payment URL. */
export function sandboxCheckoutUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "us-east-1.sandbox.payments.monetization.aws.dev" || url.port || url.username || url.password) {
    throw new Error("The provider returned a non-sandbox checkout URL.");
  }
  return raw;
}

export function dollarAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
