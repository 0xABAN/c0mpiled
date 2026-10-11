import { defineConfig } from "drizzle-kit";

import { RDS_CA_BUNDLE } from "./src/backend/db/rds-ca";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run drizzle-kit through the npm db:* scripts.");

// drizzle-kit only accepts a custom CA through discrete credentials, not a URL.
const { hostname, port, username, password, pathname } = new URL(url);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/backend/db/schema.ts",
  out: "./src/backend/db/migrations",
  dbCredentials: {
    host: hostname,
    port: Number(port || 5432),
    user: decodeURIComponent(username),
    password: decodeURIComponent(password),
    database: pathname.slice(1),
    ssl: { ca: RDS_CA_BUNDLE },
  },
  strict: true,
});
