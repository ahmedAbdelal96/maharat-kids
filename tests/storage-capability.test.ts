import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cwd = process.cwd();
const storageKeys = [
  "STORAGE_PROVIDER",
  "PUBLIC_MEDIA_BASE_URL",
  "STORAGE_S3_PUBLIC_BUCKET",
  "STORAGE_S3_PRIVATE_BUCKET",
  "STORAGE_S3_ACCESS_KEY_ID",
  "STORAGE_S3_SECRET_ACCESS_KEY",
  "STORAGE_S3_REGION",
  "STORAGE_S3_ENDPOINT",
];

function runStorage(overrides: Record<string, string | undefined>) {
  const environment: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production" };
  for (const key of storageKeys) delete environment[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[key];
    else environment[key] = value;
  }
  return spawnSync(process.execPath, ["node_modules/tsx/dist/cli.cjs", "-e", "import { getStorageCapability, publicObjectStorage } from './src/modules/storage/provider.ts'; (async () => { const capability = getStorageCapability(); let operation = 'ok'; try { await publicObjectStorage.put({ key: 'test.jpg', bytes: new Uint8Array([1]), mimeType: 'image/jpeg' }); } catch (error) { operation = error instanceof Error ? error.message : String(error); } console.log(JSON.stringify({ capability, operation })); })();"], { cwd, encoding: "utf8", env: environment });
}

function runProductionEnv(storageProvider?: string) {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    NODE_OPTIONS: "--conditions=react-server",
    NEXT_PUBLIC_APP_URL: "https://shop.example.test",
    DATABASE_URL: "postgresql://user:password@db.example.test:5432/maharat",
    AUTH_SECRET: "production-test-secret-that-is-long-enough-123456",
    MARKET_GEO_PROVIDER: "vercel",
  };
  if (storageProvider) environment.STORAGE_PROVIDER = storageProvider;
  return spawnSync(process.execPath, ["node_modules/tsx/dist/cli.cjs", "-e", "import './src/config/env.ts'; console.log('BOOT_OK');"], { cwd, encoding: "utf8", env: environment });
}

test("production core env loads without object storage", () => {
  const result = runProductionEnv();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /BOOT_OK/);
});

test("production local storage remains rejected by the core contract", () => {
  const result = runProductionEnv("local");
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /Production local storage is not supported/);
});

test("production with no storage configuration boots in unavailable mode", () => {
  const result = runStorage({});
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"status":"unavailable"/);
  assert.match(result.stdout, /"operation":"STORAGE_UNAVAILABLE"/);
});

test("production partial S3 configuration is unavailable and never local", () => {
  const result = runStorage({ STORAGE_PROVIDER: "s3", STORAGE_S3_REGION: "auto" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"reason":"incomplete"/);
  assert.match(result.stdout, /"operation":"STORAGE_UNAVAILABLE"/);
});

test("production local storage is disabled", () => {
  const result = runStorage({ STORAGE_PROVIDER: "local" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"reason":"production-local-disabled"/);
  assert.match(result.stdout, /"operation":"STORAGE_UNAVAILABLE"/);
});

test("complete S3 configuration activates storage without contacting the provider", () => {
  const result = runStorage({
    STORAGE_PROVIDER: "s3",
    PUBLIC_MEDIA_BASE_URL: "https://cdn.example.test",
    STORAGE_S3_PUBLIC_BUCKET: "public-media",
    STORAGE_S3_PRIVATE_BUCKET: "private-assets",
    STORAGE_S3_ACCESS_KEY_ID: "access-key-fixture",
    STORAGE_S3_SECRET_ACCESS_KEY: "secret-key-fixture",
    STORAGE_S3_REGION: "auto",
    STORAGE_S3_ENDPOINT: "https://s3.example.test",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"status":"available","provider":"s3"/);
});
