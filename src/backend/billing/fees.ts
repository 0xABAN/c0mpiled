/**
 * Split a book's listed USD price without surcharging the buyer.
 * Roster takes 5%, rounded to the nearest cent (half cents round up).
 * These amounts exclude processor costs; persist the fee when recording a purchase,
 * never recalculate historical earnings from the current rate or book price.
 */
export function splitBookPrice(priceCents: number) {
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 2_147_483_647) {
    throw new RangeError("Book price must be nonnegative PostgreSQL integer cents.");
  }

  // 5% is 1/20. Adding half the denominator rounds using integer arithmetic.
  const platformFeeCents = Math.floor((priceCents + 10) / 20);
  return { priceCents, platformFeeCents, clubPayoutCents: priceCents - platformFeeCents };
}
