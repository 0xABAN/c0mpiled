/**
 * Creates Roster's own login role and database on an existing RDS Postgres instance.
 *
 * Usage (prints one line for .env.local, so redirect it instead of displaying the password):
 *
 *   ADMIN_DATABASE_URL=postgres://admin:...@host:5432/anydb \
 *     npx tsx infra/create-database.ts >> .env.local
 *
 * The admin URL needs a role with CREATEROLE and CREATEDB (the RDS master user has both).
 * The script refuses to run if the role or database already exists, so it never touches
 * existing data.
 */

import { randomBytes } from "node:crypto";

import { Client } from "pg";

import { RDS_CA_BUNDLE } from "../src/backend/db/rds-ca";

const NAME = "roster";

async function main() {
  const adminUrl = process.env.ADMIN_DATABASE_URL;
  if (!adminUrl) throw new Error("Set ADMIN_DATABASE_URL to a connection string for the RDS master user.");

  const admin = new Client({ connectionString: adminUrl, ssl: { ca: RDS_CA_BUNDLE } });
  await admin.connect();

  try {
    const existing = await admin.query(
      "select (select count(*) from pg_roles where rolname = $1) as roles, (select count(*) from pg_database where datname = $1) as databases",
      [NAME],
    );
    const { roles, databases } = existing.rows[0];
    if (Number(roles) > 0 || Number(databases) > 0) {
      throw new Error(`A role or database named "${NAME}" already exists. Remove it by hand if you mean to recreate it.`);
    }

    // DDL can't take bind parameters. The password is base64url, so it never needs quoting.
    const password = randomBytes(32).toString("base64url");
    await admin.query(`create role ${NAME} login password '${password}'`);

    // Postgres 16 only lets a role create a database owned by roles it can SET ROLE to.
    const { rows } = await admin.query("select current_user as name");
    await admin.query(`grant ${NAME} to ${rows[0].name}`);
    await admin.query(`create database ${NAME} owner ${NAME}`);
    await admin.query(`revoke all on database ${NAME} from public`);

    const url = new URL(adminUrl);
    url.username = NAME;
    url.password = password;
    url.pathname = `/${NAME}`;

    console.log(`DATABASE_URL=${url.toString()}`);
  } finally {
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
