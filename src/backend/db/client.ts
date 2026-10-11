import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { RDS_CA_BUNDLE } from "./rds-ca";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Opens a connection pool that verifies the RDS certificate.
 *
 * Each server instance (a Lambda on Amplify) gets its own pool, so keep `max` small: a
 * db.t4g.micro allows only about 80 connections in total.
 */
export function createDatabase(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString, ssl: { ca: RDS_CA_BUNDLE }, max: 5 });
  return { db: drizzle(pool, { schema }), pool };
}

function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See AGENTS.md for the env vars.");
  return url;
}

// Reuse one pool across dev-server hot reloads instead of leaking a new one per edit.
const globalForDb = globalThis as typeof globalThis & { rosterDb?: Database };

export const db: Database = (globalForDb.rosterDb ??= createDatabase(readDatabaseUrl()).db);
