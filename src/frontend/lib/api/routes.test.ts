import assert from "node:assert/strict";
import { test } from "node:test";

import { accountHomeHref, safeNextPath } from "./routes";

test("authentication routes to account pages, never the public homepage", () => {
  assert.equal(accountHomeHref({ accountType: null, onboarded: false }), "/signup");
  assert.equal(accountHomeHref({ accountType: "school", onboarded: false }), "/setup");
  assert.equal(accountHomeHref({ accountType: "recruiter", onboarded: false }), "/setup");
  assert.equal(accountHomeHref({ accountType: "school", onboarded: true }), "/resume");
  assert.equal(accountHomeHref({ accountType: "recruiter", onboarded: true }), "/browse");
});

test("login preserves local deep links but rejects external destinations", () => {
  assert.equal(safeNextPath("/browse?year=2028&r=resume#details"), "/browse?year=2028&r=resume#details");
  assert.equal(safeNextPath("/"), "/");
  for (const path of [undefined, ["/browse"], "https://example.com", "//example.com", "/\\example.com", "/\t/example.com", "//["]) {
    assert.equal(safeNextPath(path), null);
  }
});
