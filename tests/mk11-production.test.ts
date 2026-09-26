import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cwd = process.cwd();

function runProduction(script: string, overrides: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, ["--env-file=.env", "node_modules/tsx/dist/cli.cjs", "-e", script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://shop.example.test",
      DATABASE_URL: "postgresql://user:password@db.example.test:5432/maharat",
      AUTH_SECRET: "production-test-secret-that-is-long-enough-123456",
      STORAGE_PROVIDER: "s3",
      PUBLIC_MEDIA_BASE_URL: "https://cdn.example.test",
      STORAGE_S3_PUBLIC_BUCKET: "public-media",
      STORAGE_S3_PRIVATE_BUCKET: "private-assets",
      STORAGE_S3_ACCESS_KEY_ID: "access-key-fixture",
      STORAGE_S3_SECRET_ACCESS_KEY: "secret-key-fixture",
      STORAGE_S3_REGION: "auto",
      STORAGE_S3_ENDPOINT: "https://s3.example.test",
      MARKET_TRUSTED_PROXY_SECRET: "proxy-secret-that-is-long-enough-123456",
      ...overrides,
    },
  });
  return `${result.stdout}${result.stderr}`;
}

test("production configuration rejects local storage and missing trust boundary", () => {
  const output = runProduction("import './src/config/env.ts'");
  assert.doesNotMatch(output, /DURABLE_STORAGE_REQUIRED_IN_PRODUCTION/);

  const localStorageOutput = runProduction("import './src/config/env.ts'", {
    STORAGE_PROVIDER: "local",
    MARKET_TRUSTED_PROXY_SECRET: "",
  });
  assert.match(localStorageOutput, /Production local storage is not supported|MARKET_TRUSTED_PROXY_SECRET is required/);
});

test("Vercel geo provider does not require the custom proxy secret", () => {
  const output = runProduction("import './src/config/env.ts'", {
    MARKET_GEO_PROVIDER: "vercel",
    MARKET_TRUSTED_PROXY_SECRET: "",
  });
  assert.doesNotMatch(output, /MARKET_TRUSTED_PROXY_SECRET is required/);
});

test("trusted proxy provider still requires its secret", () => {
  const output = runProduction("import './src/config/env.ts'", {
    MARKET_GEO_PROVIDER: "trusted_proxy",
    MARKET_TRUSTED_PROXY_SECRET: "",
  });
  assert.match(output, /MARKET_TRUSTED_PROXY_SECRET is required/);
});

test("development payment and address providers cannot be selected in production", () => {
  const output = runProduction(
    "import { getPaymentGateway } from './src/modules/payments/providers/gateway.ts'; import { DevelopmentAddressResolutionProvider } from './src/modules/addresses/providers/development-provider.ts'; console.log(String(getPaymentGateway('PAYZATY_TEST'))); try { new DevelopmentAddressResolutionProvider(); } catch (error) { console.log((error as Error).message); }",
  );
  assert.match(output, /null/);
  assert.match(output, /ADDRESS_PROVIDER_UNAVAILABLE/);
});

test("production seed source excludes operational test fixtures", () => {
  const seed = readFileSync("prisma/seed.ts", "utf8");
  assert.match(seed, /if \(!production\)/);
  assert.match(seed, /const seedDemoCatalog = !production/);
  assert.match(seed, /id: \{ startsWith: "seed-" \}/);
  assert.doesNotMatch(seed, /Test Express/);
});
