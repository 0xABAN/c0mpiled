// Prints, as JSON, the env vars from an env file that the Amplify app needs at runtime.
// Usage: node infra/lib/app-env.mjs <env-file>
// Reads the file without sourcing it, so values are never evaluated by a shell.

import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node infra/lib/app-env.mjs <env-file>");

const RUNTIME_VARS = /^(DATABASE_URL|APP_REGION|RESUME_BUCKET|BEDROCK_MODEL_ID|NEXT_PUBLIC_[A-Z_]+)=(.*)$/;
const REQUIRED = [
  "DATABASE_URL",
  "APP_REGION",
  "RESUME_BUCKET",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID",
  "NEXT_PUBLIC_DEMO_PASSWORD",
];

const env = Object.fromEntries(
  readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.match(RUNTIME_VARS))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

for (const name of REQUIRED) {
  if (!env[name]) throw new Error(`${name} is missing from ${file}`);
}

console.log(JSON.stringify(env));
