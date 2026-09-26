import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schema = readFileSync("src/config/env.ts", "utf8");
const example = readFileSync(".env.example", "utf8");
const deployment = readFileSync("docs/production-deployment.md", "utf8");

const productionCriticalNames = [
  "NEXT_PUBLIC_APP_URL", "DATABASE_URL", "AUTH_SECRET", "STORAGE_PROVIDER", "PUBLIC_MEDIA_BASE_URL",
  "STORAGE_S3_PUBLIC_BUCKET", "STORAGE_S3_PRIVATE_BUCKET", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY", "STORAGE_S3_REGION",
];

test("production-critical environment names remain aligned with the schema and deployment docs", () => {
  for (const name of productionCriticalNames) {
    assert.match(schema, new RegExp(`\\b${name}\\b`), `${name} must remain in src/config/env.ts`);
    assert.match(example, new RegExp(`^${name}=`, "m"), `${name} must remain in .env.example`);
    assert.match(deployment, new RegExp(`\\b${name}\\b`), `${name} must remain in production deployment documentation`);
  }
});

test("production documentation preserves the Vercel market and storage boundary", () => {
  assert.match(deployment, /MARKET_GEO_PROVIDER=vercel/);
  assert.match(deployment, /MARKET_TRUSTED_PROXY_SECRET.*not required|MARKET_TRUSTED_PROXY_SECRET.*intentionally not required/i);
  assert.match(deployment, /separate public and private buckets/i);
});
