// node --import tsx --test src/backend/billing/contracts.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { browseReturnPath, dollarAmount, hasPaidBookUnit, sandboxCheckoutUrl, sandboxConfig } from "./contracts";

const arn = "arn:aws:appmonetization:us-west-2:111111111111:apps/test-app/sandbox";
const endpoint = "https://us-west-2.alpha.monetization.aws.dev";
const paid = {
  decision: "ALLOW",
  reason: { category: "USAGE", code: "COVERED_BY_PURCHASED_UNITS" },
  metrics: [{ metricCode: "book-price-metric", remaining: 1 }],
};

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

test("billing cannot silently switch to live mode or another signing region", () => {
  assert.equal(sandboxConfig(arn, endpoint).appId, "test-app");
  for (const invalid of [undefined, "test-app", arn.replace("/sandbox", ""), arn.replace("test-app", "test-app-shadow")]) {
    assert.throws(() => sandboxConfig(invalid, endpoint));
  }
  for (const invalid of [undefined, "http://us-west-2.alpha.monetization.aws.dev", "https://attacker.example", endpoint.replace("west-2", "east-1"), `${endpoint}/route`, `${endpoint}?secret=x`]) {
    assert.throws(() => sandboxConfig(arn, invalid));
  }
});

test("checkout preserves browse filters without accepting open redirects", () => {
  const path = "/browse?q=python&skill=SQL&school=psu.edu&r=resume-id";
  assert.equal(browseReturnPath(path), path);
  for (const invalid of ["//attacker.example/browse", "https://attacker.example/browse", "/billing", "/browse/../login", "/browse#fragment", "/browse\\..\\login"]) {
    assert.throws(() => browseReturnPath(invalid));
  }
});

test("only hosted sandbox checkout URLs reach the browser", () => {
  const url = "https://us-east-1.sandbox.payments.monetization.aws.dev/checkout#fictional-token";
  assert.equal(sandboxCheckoutUrl(url), url);
  for (const invalid of ["javascript:alert(1)", "https://checkout.stripe.com/test", url.replace("https:", "http:"), url.replace("sandbox.", ""), url.replace(".aws.dev", ".aws.dev.attacker.example")]) {
    assert.throws(() => sandboxCheckoutUrl(invalid));
  }
  assert.equal(dollarAmount(25_000), "250.00");
  assert.equal(dollarAmount(25_001), "250.01");
});
