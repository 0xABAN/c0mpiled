// node --import tsx --test src/backend/resumes/linkedin.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { linkedinUrlInput } from "./linkedin";

test("optional LinkedIn contact normalizes personal profiles and removes tracking", () => {
  for (const value of [
    "https://www.linkedin.com/in/roster-example/",
    "linkedin.com/in/roster-example",
    "  https://uk.linkedin.com/in/roster-example?utm_source=share#contact  ",
  ]) {
    assert.equal(linkedinUrlInput.parse(value), "https://www.linkedin.com/in/roster-example");
  }
  assert.equal(linkedinUrlInput.parse("   "), null);
});

test("LinkedIn validation rejects unsafe schemes, impostor hosts and non-profile links", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://linkedin.com/in/example",
    "https://linkedin.com.evil.example/in/example",
    "https://notlinkedin.com/in/example",
    "https://www.linkedin.com@evil.example/in/example",
    "https://user:password@linkedin.com/in/example",
    "https://linkedin.com:8443/in/example",
    "https://linkedin.com/company/example",
    "https://linkedin.com/in/",
    "https://linkedin.com/in/example/extra",
    "https://linkedin.com/in/../feed",
    "x".repeat(501),
    null,
    undefined,
    { linkedinUrl: "https://linkedin.com/in/example" },
  ]) {
    assert.equal(linkedinUrlInput.safeParse(value).success, false, `Accepted invalid profile: ${JSON.stringify(value)}`);
  }
});
