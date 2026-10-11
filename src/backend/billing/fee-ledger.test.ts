// node --conditions=react-server --env-file=.env.local --import tsx --test src/backend/billing/fee-ledger.test.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createDatabase } from "@/backend/db/client";

import { splitBookPrice } from "./fees";

test("the ledger stores consistent splits and requires an explicit fee on new purchases", async () => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "Set DATABASE_URL to test the migrated schema.");
  const { pool } = createDatabase(url);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // LIKE copies generated columns and checks, not foreign keys. All fixture writes stay
    // in this connection's temporary table; no users, books, or purchases are changed.
    await client.query("CREATE TEMP TABLE fee_ledger_test (LIKE public.unlocks INCLUDING ALL) ON COMMIT DROP");
    const { platformFeeCents } = splitBookPrice(25_000);
    const inserted = await client.query(
      `INSERT INTO fee_ledger_test (book_id, recruiter_id, price_cents, platform_fee_cents)
       VALUES ($1, 'fee-test-current', 25000, $2), ($1, 'fee-test-historical', 25000, 0)
       RETURNING price_cents, platform_fee_cents, club_payout_cents`,
      [randomUUID(), platformFeeCents],
    );
    assert.deepEqual(inserted.rows, [
      { price_cents: 25_000, platform_fee_cents: 1_250, club_payout_cents: 23_750 },
      { price_cents: 25_000, platform_fee_cents: 0, club_payout_cents: 25_000 },
    ]);

    const { rows: [totals] } = await client.query(
      "SELECT sum(price_cents)::integer AS gross, sum(club_payout_cents)::integer AS net FROM fee_ledger_test",
    );
    assert.deepEqual(totals, { gross: 50_000, net: 48_750 });

    const cases = [
      { columns: "price_cents", values: "25000", code: "23502" }, // Missing fee, no silent default.
      { columns: "price_cents, platform_fee_cents", values: "25000, -1", code: "23514" },
      { columns: "price_cents, platform_fee_cents", values: "25000, 25001", code: "23514" },
      { columns: "price_cents, platform_fee_cents", values: "-1, 0", code: "23514" },
      { columns: "price_cents, platform_fee_cents, club_payout_cents", values: "25000, 1250, 25000", code: "428C9" },
    ];
    for (const invalid of cases) {
      await client.query("SAVEPOINT invalid_split");
      await assert.rejects(
        client.query(
          `INSERT INTO fee_ledger_test (book_id, recruiter_id, ${invalid.columns})
           VALUES ($1, 'fee-test-invalid', ${invalid.values})`,
          [randomUUID()],
        ),
        { code: invalid.code },
      );
      await client.query("ROLLBACK TO SAVEPOINT invalid_split");
      await client.query("RELEASE SAVEPOINT invalid_split");
    }
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
