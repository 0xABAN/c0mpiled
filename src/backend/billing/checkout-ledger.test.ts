// node --conditions=react-server --env-file=.env.local --import tsx --test src/backend/billing/checkout-ledger.test.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createDatabase } from "@/backend/db/client";

test("checkout constraints prevent competing pending intents and duplicate ledger purchases", async () => {
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL to test the migrated schema.");
  const { pool } = createDatabase(process.env.DATABASE_URL);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // LIKE copies checks/indexes but not foreign keys. No application records are touched.
    await client.query("CREATE TEMP TABLE checkout_test (LIKE public.book_checkouts INCLUDING ALL) ON COMMIT DROP");
    await client.query("CREATE TEMP TABLE unlock_test (LIKE public.unlocks INCLUDING ALL) ON COMMIT DROP");
    const bookId = randomUUID();
    const args = [bookId, randomUUID()];
    const columns = "book_id, recruiter_id, app_arn, product_id, price_cents, platform_fee_cents, return_path, callback_url";
    const values = "$1, 'test-buyer', 'test-app/sandbox', $2, 30000, 1500, '/browse', 'https://example.com/checkout'";
    const { rows: [first] } = await client.query(`INSERT INTO checkout_test (${columns}) VALUES (${values}) RETURNING id`, args);

    await client.query("SAVEPOINT competing");
    await assert.rejects(client.query(`INSERT INTO checkout_test (${columns}) VALUES (${values})`, args), { code: "23505" });
    await client.query("ROLLBACK TO SAVEPOINT competing");

    await client.query("UPDATE checkout_test SET expired_at = now() WHERE id=$1", [first.id]);
    await client.query(`INSERT INTO checkout_test (${columns}) VALUES (${values})`, args);

    const insert = `INSERT INTO unlock_test (book_id, recruiter_id, checkout_id, price_cents, platform_fee_cents)
      VALUES ($1, 'test-buyer', $2, 30000, 1500)
      ON CONFLICT (book_id, recruiter_id) DO NOTHING RETURNING club_payout_cents`;
    assert.deepEqual((await client.query(insert, [bookId, first.id])).rows, [{ club_payout_cents: 28_500 }]);
    assert.equal((await client.query(insert, [bookId, first.id])).rowCount, 0);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM unlock_test")).rows[0].n, 1);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
