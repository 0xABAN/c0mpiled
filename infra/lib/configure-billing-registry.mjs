// Amplify build-only setup. Never write this token to .env.production or client assets.
import { chmodSync, writeFileSync } from "node:fs";

const { MONETIZATION_NPM_REGISTRY: registry, MONETIZATION_NPM_TOKEN: token } = process.env;
if (!registry || !token || /[\r\n]/.test(token)) {
  throw new Error("Set MONETIZATION_NPM_REGISTRY and MONETIZATION_NPM_TOKEN for the private billing package.");
}

const url = new URL(registry);
if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
  throw new Error("The private registry must be an HTTPS URL without credentials or query parameters.");
}
if (!url.pathname.endsWith("/")) url.pathname += "/";

writeFileSync(".npmrc", [
  `@aws-app-monetization:registry=${url.href}`,
  `//${url.host}${url.pathname}:_authToken=${token}`,
  "",
].join("\n"), { mode: 0o600 });
chmodSync(".npmrc", 0o600);
