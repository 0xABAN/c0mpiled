// node --import tsx --test src/backend/billing/fees.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { splitBookPrice } from "./fees";

test("the five-percent fee is deducted from the listed price, not added to it", () => {
  assert.deepEqual(splitBookPrice(25_000), {
    priceCents: 25_000, platformFeeCents: 1_250, clubPayoutCents: 23_750,
  });
  assert.deepEqual(splitBookPrice(0), { priceCents: 0, platformFeeCents: 0, clubPayoutCents: 0 });
});

test("rounding handles half cents and always conserves the gross amount", () => {
  for (const [price, fee] of [[1, 0], [9, 0], [10, 1], [19, 1], [20, 1], [29, 1], [30, 2], [999, 50], [30_000, 1_500], [65_000, 3_250], [1_000_000, 50_000], [2_147_483_647, 107_374_182]]) {
    const split = splitBookPrice(price);
    assert.equal(split.platformFeeCents, fee, `Fee for ${price} cents`);
    assert.equal(split.platformFeeCents + split.clubPayoutCents, price);
    assert.ok(split.clubPayoutCents >= 0);
  }
});

test("invalid money values fail rather than producing an incorrect quote", () => {
  for (const price of [-1, 0.5, NaN, Infinity, -Infinity, 2_147_483_648, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => splitBookPrice(price), RangeError);
  }
});
