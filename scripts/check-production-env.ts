import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE = resolve(process.cwd(), ".env.production");
const PLACEHOLDER_PATTERN = /<REAL_|<YOUR_|YOUR_|CHANGE_ME|TODO|example-key|example-secret/i;
const SECRET_PATTERN = /SECRET|PASSWORD|API_KEY|ACCESS_KEY|DATABASE_URL|TOKEN/i;
const ENV_KEYS = [
  "NODE_ENV", "NEXT_PUBLIC_APP_URL", "DATABASE_URL", "AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY", "EMAIL_FROM", "REDIS_URL", "CUSTOMER_OTP_SMS_PROVIDER", "CUSTOMER_OTP_SMS_API_URL",
  "CUSTOMER_OTP_SMS_API_KEY", "CUSTOMER_OTP_EMAIL_PROVIDER", "CUSTOMER_OTP_EMAIL_API_URL", "CUSTOMER_OTP_EMAIL_API_KEY",
  "SPL_PROVIDER", "SPL_API_BASE_URL", "SPL_API_KEY", "PAYZATY_ACCOUNT_NO", "PAYZATY_SECRET_KEY", "PAYZATY_BASE_URL",
  "PAYZATY_STATUS_ENDPOINT", "PAYZATY_SANDBOX", "MARKET_GEO_PROVIDER", "MARKET_TRUSTED_COUNTRY_HEADER",
  "MARKET_TRUSTED_PROXY_HEADER", "MARKET_TRUSTED_PROXY_SECRET", "MARKET_DEVELOPMENT_FALLBACK", "UPLOAD_MAX_BYTES",
  "STORAGE_PROVIDER", "PUBLIC_MEDIA_BASE_URL", "PUBLIC_STORAGE_ROOT", "PRIVATE_STORAGE_ROOT", "STORAGE_S3_ENDPOINT",
  "STORAGE_S3_REGION", "STORAGE_S3_PUBLIC_BUCKET", "STORAGE_S3_PRIVATE_BUCKET", "STORAGE_S3_ACCESS_KEY_ID",
  "STORAGE_S3_SECRET_ACCESS_KEY", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD", "SEED_DEMO_CATALOG",
] as const;

type Parsed = { values: Record<string, string>; duplicates: string[]; malformed: number[] };

function parseEnvFile(contents: string): Parsed {
  const values: Record<string, string> = {};
  const duplicates: string[] = [];
  const malformed: number[] = [];
  contents.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      malformed.push(index + 1);
      return;
    }
    const [, key, raw] = match;
    if (key in values) duplicates.push(key);
    let value = raw.trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  });
  return { values, duplicates, malformed };
}

function status(key: string, value: string | undefined): string {
  if (!value) return "MISSING";
  if (PLACEHOLDER_PATTERN.test(value)) return "PLACEHOLDER";
  if (SECRET_PATTERN.test(key)) return "CONFIGURED";
  return "CONFIGURED";
}

function setProductionEnv(values: Record<string, string>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.NEXT_PHASE;
  delete process.env.MK_E2E_TEST_MODE;
}

const parsed = parseEnvFile(readFileSync(ENV_FILE, "utf8"));
const ambientConfigured = new Set(ENV_KEYS.filter((key) => Boolean(process.env[key])));
setProductionEnv(parsed.values);

function fileDefines(file: string, key: string): boolean {
  try {
    return readFileSync(resolve(process.cwd(), file), "utf8").split(/\r?\n/).some((line) => {
      const normalized = line.trimStart().replace(/^export\s+/, "");
      return normalized.startsWith(`${key}=`) || normalized.startsWith(`${key} =`);
    });
  } catch {
    return false;
  }
}

const failures: string[] = [];
if (parsed.duplicates.length) failures.push(`duplicate declarations: ${[...new Set(parsed.duplicates)].join(", ")}`);
if (parsed.malformed.length) failures.push(`malformed lines: ${parsed.malformed.join(", ")}`);

const appUrl = parsed.values.NEXT_PUBLIC_APP_URL;
if (!appUrl) failures.push("NEXT_PUBLIC_APP_URL: MISSING");
else if (!appUrl.startsWith("https://")) failures.push("NEXT_PUBLIC_APP_URL: must use HTTPS");
else if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(appUrl)) failures.push("NEXT_PUBLIC_APP_URL: cannot point to localhost");
if (parsed.values.MARKET_GEO_PROVIDER !== "vercel") failures.push("MARKET_GEO_PROVIDER: production Vercel mode must be vercel");
if (parsed.values.MARKET_TRUSTED_PROXY_SECRET && parsed.values.MARKET_GEO_PROVIDER === "vercel") failures.push("MARKET_TRUSTED_PROXY_SECRET: NOT REQUIRED in Vercel mode; remove it from the production file");
if (parsed.values.MARKET_DEVELOPMENT_FALLBACK) failures.push("MARKET_DEVELOPMENT_FALLBACK: must not be configured in production");
if (parsed.values.SEED_DEMO_CATALOG?.toLowerCase() === "true") failures.push("SEED_DEMO_CATALOG: demo activation is disabled in production");
if (parsed.values.STORAGE_PROVIDER !== "s3") failures.push("STORAGE_PROVIDER: must be s3");
for (const key of ["PUBLIC_MEDIA_BASE_URL", "STORAGE_S3_PUBLIC_BUCKET", "STORAGE_S3_PRIVATE_BUCKET", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY", "STORAGE_S3_REGION"]) {
  const value = parsed.values[key];
  if (!value) failures.push(`${key}: MISSING`);
  else if (PLACEHOLDER_PATTERN.test(value)) failures.push(`${key}: PLACEHOLDER`);
}
if (parsed.values.PUBLIC_MEDIA_BASE_URL && !/^https:\/\//i.test(parsed.values.PUBLIC_MEDIA_BASE_URL)) failures.push("PUBLIC_MEDIA_BASE_URL: must be a valid HTTPS URL");
if (parsed.values.STORAGE_S3_ENDPOINT && PLACEHOLDER_PATTERN.test(parsed.values.STORAGE_S3_ENDPOINT)) failures.push("STORAGE_S3_ENDPOINT: PLACEHOLDER");
if (parsed.values.STORAGE_S3_ENDPOINT && !/^https:\/\//i.test(parsed.values.STORAGE_S3_ENDPOINT)) failures.push("STORAGE_S3_ENDPOINT: must be a valid HTTPS URL");
if (parsed.values.DATABASE_URL && /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(parsed.values.DATABASE_URL)) failures.push("DATABASE_URL: cannot point to localhost");

if (!parsed.values.DATABASE_URL) failures.push("DATABASE_URL: MISSING");
else if (!/^postgres(?:ql)?:\/\//i.test(parsed.values.DATABASE_URL)) failures.push("DATABASE_URL: must use PostgreSQL");
if (!parsed.values.AUTH_SECRET) failures.push("AUTH_SECRET: MISSING");
else if (parsed.values.AUTH_SECRET.length < 32) failures.push("AUTH_SECRET: INVALID FORMAT");
if (parsed.values.NEXT_PUBLIC_APP_URL && !/^https?:\/\/[^\s]+$/i.test(parsed.values.NEXT_PUBLIC_APP_URL)) failures.push("NEXT_PUBLIC_APP_URL: INVALID FORMAT");

console.log("Production environment validation: " + (failures.length ? "FAIL" : "PASS"));
console.log(`APP: NEXT_PUBLIC_APP_URL ........ ${status("NEXT_PUBLIC_APP_URL", parsed.values.NEXT_PUBLIC_APP_URL)}`);
console.log(`MARKET: MARKET_GEO_PROVIDER ...... ${parsed.values.MARKET_GEO_PROVIDER || "MISSING"}`);
console.log(`MARKET: Development fallback ...... ${parsed.values.MARKET_DEVELOPMENT_FALLBACK ? "INVALID" : "not enabled"}`);
console.log(`STORAGE: STORAGE_PROVIDER .......... ${parsed.values.STORAGE_PROVIDER || "MISSING"}`);
for (const key of ["PUBLIC_MEDIA_BASE_URL", "STORAGE_S3_PUBLIC_BUCKET", "STORAGE_S3_PRIVATE_BUCKET", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY", "STORAGE_S3_REGION", "STORAGE_S3_ENDPOINT"]) console.log(`STORAGE: ${key.padEnd(30, ".")} ${status(key, parsed.values[key])}`);
for (const key of ["DATABASE_URL", "AUTH_SECRET"]) console.log(`CORE: ${key.padEnd(34, ".")} ${status(key, parsed.values[key])}`);
for (const key of ["NEXT_PUBLIC_APP_URL", "MARKET_GEO_PROVIDER", "STORAGE_PROVIDER", "DATABASE_URL", "PUBLIC_MEDIA_BASE_URL"]) {
  const sources = ["process.env", ".env", ".env.local", ".env.production", ".env.production.local"].filter((source) => source === "process.env" ? ambientConfigured.has(key as typeof ENV_KEYS[number]) : fileDefines(source, key));
  const sourceStatus = parsed.values[key] ? ".env.production" : ".env.production (missing; fallback intentionally ignored)";
  console.log(`SOURCE: ${key.padEnd(31, ".")} ${sourceStatus}${sources.length > 1 ? ` (conflicts: ${sources.filter((source) => source !== ".env.production").join(", ")})` : ""}`);
}
if (failures.length) {
  console.error("\nProduction environment blockers:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
