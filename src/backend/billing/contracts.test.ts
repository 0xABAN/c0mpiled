// node --import tsx --test src/backend/billing/contracts.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { sameBillingApp, isDemoBuyer, browseReturnPath, dollarAmount, hasPaidBookUnit, providerCheckoutUrl, providerConfig } from "./contracts";

const arn = "arn:aws:appmonetization:us-west-2:111111111111:apps/test-app/sandbox";
const endpoint = "https://us-west-2.alpha.monetization.aws.dev";
const paid = {
  decision: "ALLOW",
  reason: { category: "USAGE", code: "COVERED_BY_PURCHASED_UNITS" },
  metrics: [{ metricCode: "book-price-metric", remaining: 1 }],
};

test("shared catalog identity never crosses provider apps", () => {
  assert.equal(sameBillingApp(arn, arn.replace("/sandbox", "")), true);
  assert.equal(sameBillingApp(arn, arn.replace("test-app", "another-app")), false);
});

test("shared demo and synthetic identities cannot make real purchases", () => {
  assert.equal(isDemoBuyer({ id: "real-cognito-id", email: "buyer@example.com" }), false);
  for (const account of [
    { id: "real-cognito-id", email: "DEMO.COMPANY@EXAMPLE.COM" },
    { id: "seed:buyer", email: "buyer@example.com" },
    { id: "demo:buyer", email: "buyer@example.com" },
  ]) assert.equal(isDemoBuyer(account), true);
});

test("only the exact paid book metric authorizes an unlock", () => {
  assert.equal(hasPaidBookUnit(paid, "book-price-metric"), true);
  for (const response of [
    null, {}, { ...paid, decision: "DENY" },
    { ...paid, reason: { category: "USAGE", code: "WITHIN_QUOTA" } },
    { ...paid, reason: { category: "CAPABILITY", code: "COVERED_BY_PURCHASED_UNITS" } },
    { ...paid, metrics: [] },
    { ...paid, metrics: [{ metricCode: "another-book", remaining: 1 }] },
    { ...paid, metrics: [{ metricCode: "book-price-metric", remaining: 0 }] },
    { ...paid, metrics: [{ metricCode: "book-price-metric", remaining: Infinity }] },
    { ...paid, metrics: [{ metricCode: "book-price-metric", remaining: "1" }] },
    { ...paid, metrics: [...paid.metrics, { metricCode: "another-book", remaining: 1 }] },
  ]) assert.equal(hasPaidBookUnit(response, "book-price-metric"), false);
  assert.equal(hasPaidBookUnit(paid, "old-cheaper-price-metric"), false);
});

test("billing explicitly selects live or sandbox and rejects another signing region", () => {
  assert.equal(providerConfig(arn, endpoint).mode, "sandbox");
  assert.equal(providerConfig(arn.replace("/sandbox", ""), endpoint).mode, "live");
  for (const invalid of [undefined, "test-app", arn + "/live", arn.replace("test-app", "test-app-shadow")]) {
    assert.throws(() => providerConfig(invalid, endpoint));
  }
  for (const invalid of [undefined, "http://us-west-2.alpha.monetization.aws.dev", "https://attacker.example", endpoint.replace("west-2", "east-1"), `${endpoint}/route`, `${endpoint}?secret=x`]) {
    assert.throws(() => providerConfig(arn, invalid));
  }
});

test("checkout preserves browse filters without accepting open redirects", () => {
  const path = "/browse?q=python&skill=SQL&school=psu.edu&r=resume-id";
  assert.equal(browseReturnPath(path), path);
  for (const invalid of ["//attacker.example/browse", "https://attacker.example/browse", "/billing", "/browse/../login", "/browse#fragment", "/browse\\..\\login"]) {
    assert.throws(() => browseReturnPath(invalid));
  }
});

test("checkout URLs must match the explicit billing environment", () => {
  const url = "https://us-east-1.sandbox.payments.monetization.aws.dev/checkout#fictional-token";
  assert.equal(providerCheckoutUrl(url, "sandbox"), url);
  const live = url.replace("sandbox.", "");
  assert.equal(providerCheckoutUrl(live, "live"), live);
  assert.throws(() => providerCheckoutUrl(url, "live"));
  for (const invalid of ["javascript:alert(1)", "https://checkout.stripe.com/test", url.replace("https:", "http:"), url.replace("sandbox.", ""), url.replace(".aws.dev", ".aws.dev.attacker.example")]) {
    assert.throws(() => providerCheckoutUrl(invalid, "sandbox"));
  }
  assert.equal(dollarAmount(25_000), "250.00");
  assert.equal(dollarAmount(25_001), "250.01");
});
