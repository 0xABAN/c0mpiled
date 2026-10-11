import "server-only";

import { join } from "node:path";
import { MonetizationAI } from "@aws-app-monetization/sdk";
import { z } from "zod";

import { UserError } from "@/backend/errors";

import { dollarAmount, hasPaidBookUnit, sandboxCheckoutUrl, sandboxConfig } from "./contracts";

export function billingConfig() {
  return sandboxConfig(process.env.MONETIZATION_APP_ID, process.env.MONETIZATION_ENDPOINT);
}

function client() {
  const config = billingConfig();
  return new MonetizationAI({ appId: config.appArn, endpoint: config.endpoint, maxRetries: 0 });
}

/** Log diagnostics without checkout URLs, tokens, buyer details, or raw provider responses. */
async function callProvider<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    console.error("Sandbox billing failed", { operation, error: error instanceof Error ? error.name : "UnknownError" });
    throw new UserError("Test checkout could not reach or verify the payment provider. Please try again.", { cause: error });
  }
}

export type CatalogProduct = { id: string; name: string; priceCents: number };
export const productCode = (id: string) => `book_${id.replaceAll("-", "")}`;

/**
 * Author one immutable draft product per book/price. The sandbox reads drafts; never publish them.
 * Stable database product IDs make retrying either provider write idempotent.
 */
export async function createProduct(product: CatalogProduct): Promise<string> {
  const config = billingConfig();
  const code = productCode(product.id);

  return callProvider("create-product", async () => {
    const { metric } = await client().createMetric({
      name: code,
      description: `One-time access to resume book product ${product.id}`,
      sourceEventType: code,
      unitName: "book",
      definition: { filters: [], function: "COUNT", groupBy: [], period: "MONTHLY" },
      clientToken: `${product.id}-metric`,
    });
    if (!metric.metricId || metric.appId !== config.appId || metric.sourceEventType !== code) {
      throw new Error("Unexpected catalog metric.");
    }

    // This pinned beta wrapper lacks createOneTimePayment. Use its bundled generated
    // command, isolated here; no vendor source or private package is copied into the repo.
    // Node's runtime loader avoids Webpack rewriting a dynamic createRequire to undefined.
    const { createRequire } = process.getBuiltinModule("module");
    const require = createRequire(join(process.cwd(), "package.json"));
    const sdkRequire = createRequire(require.resolve("@aws-app-monetization/sdk"));
    const generated = sdkRequire("@amzn/aws-monetizationai-frontend-ts-client") as {
      AppMonetizationClient: new (config: { region: string; endpoint: string; maxAttempts: number }) => { send(command: unknown): Promise<unknown> };
      CreateOneTimePaymentCommand: new (input: unknown) => unknown;
    };
    const api = new generated.AppMonetizationClient({ region: config.region, endpoint: config.endpoint, maxAttempts: 1 });
    const definition = {
      name: product.name,
      price: { amount: dollarAmount(product.priceCents), currencyCode: "USD" },
      metricId: metric.metricId,
      capacity: 1,
    };
    const response = await api.send(new generated.CreateOneTimePaymentCommand({
      appId: config.appId,
      packCode: code,
      definition,
      clientToken: `${product.id}-pack`,
    }));
    z.object({ oneTimePayment: z.object({
      appId: z.literal(config.appId),
      code: z.literal(code),
      definition: z.object({
        name: z.literal(definition.name),
        price: z.object({ amount: z.literal(definition.price.amount), currencyCode: z.literal("USD") }),
        metricId: z.literal(metric.metricId),
        capacity: z.literal(1),
      }),
    }) }).parse(response);
    return metric.metricId;
  });
}

export async function startProviderCheckout(buyerId: string, productId: string, checkoutId: string, returnUrl: string) {
  return callProvider("start-checkout", async () => {
    const response = await client().createOneTimeCheckoutSession(buyerId, [
      { type: "USAGE_PACK", purchasableCode: productCode(productId), quantity: 1 },
    ], { returnUrl, clientToken: checkoutId });

    const parsed = z.object({
      checkoutUrl: z.string().transform(sandboxCheckoutUrl),
      checkoutSessionId: z.string().min(1),
      purchaseIds: z.array(z.string().min(1)).length(1),
      expiresAt: z.iso.datetime().transform((value) => new Date(value)),
    }).parse(response);
    return parsed;
  });
}

export async function paidForProduct(buyerId: string, productId: string, metricId: string): Promise<boolean> {
  return callProvider("verify-payment", async () => {
    const result = await client().checkEntitlement(buyerId, { eventType: productCode(productId) });
    if (result.decision === "DENY") return false;
    if (!hasPaidBookUnit(result, metricId)) throw new Error("The provider did not return an exact paid-book entitlement.");
    return true;
  });
}
