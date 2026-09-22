import "server-only";

import { z } from "zod";

import { environmentNames } from "@/core/constants";

const envSchema = z.object({
  NODE_ENV: z.enum(environmentNames).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  CUSTOMER_OTP_SMS_PROVIDER: z.string().min(1).optional(),
  CUSTOMER_OTP_SMS_API_URL: z.string().url().optional(),
  CUSTOMER_OTP_SMS_API_KEY: z.string().min(1).optional(),
  CUSTOMER_OTP_EMAIL_PROVIDER: z.string().min(1).optional(),
  CUSTOMER_OTP_EMAIL_API_URL: z.string().url().optional(),
  CUSTOMER_OTP_EMAIL_API_KEY: z.string().min(1).optional(),
  SPL_PROVIDER: z.string().min(1).optional(),
  SPL_API_BASE_URL: z.string().url().optional(),
  SPL_API_KEY: z.string().min(1).optional(),
  PAYZATY_ACCOUNT_NO: z.string().min(1).optional(),
  PAYZATY_SECRET_KEY: z.string().min(1).optional(),
  PAYZATY_BASE_URL: z.string().url().optional(),
  // The official merchant endpoint may contain the adapter's {checkoutId}
  // placeholder, so validate presence here and let the provider own its URL contract.
  PAYZATY_STATUS_ENDPOINT: z.string().min(1).optional(),
  PAYZATY_SANDBOX: z.enum(["true", "false"]).optional(),
  MARKET_TRUSTED_COUNTRY_HEADER: z.string().regex(/^[a-z0-9-]{1,64}$/i).default("x-vercel-ip-country"),
  MARKET_TRUSTED_PROXY_HEADER: z.string().regex(/^[a-z0-9-]{1,64}$/i).default("x-market-trust-token"),
  MARKET_TRUSTED_PROXY_SECRET: z.string().min(32).optional(),
  MARKET_DEVELOPMENT_FALLBACK: z.enum(["SAUDI_ARABIA", "EGYPT"]).default("SAUDI_ARABIA"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),
  PUBLIC_STORAGE_ROOT: z.string().min(1).optional(),
  PRIVATE_STORAGE_ROOT: z.string().min(1).optional(),
  STORAGE_S3_ENDPOINT: z.string().url().optional(),
  STORAGE_S3_REGION: z.string().min(1).default("auto"),
  STORAGE_S3_PUBLIC_BUCKET: z.string().min(1).optional(),
  STORAGE_S3_PRIVATE_BUCKET: z.string().min(1).optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
}).superRefine((value, context) => {
  const productionBuild = process.env.NEXT_PHASE === "phase-production-build";
  // The isolated Playwright harness intentionally runs the built app with
  // NODE_ENV=production but opts into disposable fixtures explicitly.
  if (value.NODE_ENV !== "production" || productionBuild || process.env.MK_E2E_TEST_MODE === "1") return;
  if (!value.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["NEXT_PUBLIC_APP_URL"], message: "Production APP URL must use HTTPS." });
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value.NEXT_PUBLIC_APP_URL)) {
    context.addIssue({ code: "custom", path: ["NEXT_PUBLIC_APP_URL"], message: "Production APP URL cannot point to localhost." });
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value.DATABASE_URL)) {
    context.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Production DATABASE_URL cannot point to localhost." });
  }
  if (value.STORAGE_PROVIDER !== "s3") {
    context.addIssue({ code: "custom", path: ["STORAGE_PROVIDER"], message: "Production requires STORAGE_PROVIDER=s3." });
  }
  for (const [key, configured] of [
    ["PUBLIC_MEDIA_BASE_URL", value.PUBLIC_MEDIA_BASE_URL],
    ["STORAGE_S3_PUBLIC_BUCKET", value.STORAGE_S3_PUBLIC_BUCKET],
    ["STORAGE_S3_PRIVATE_BUCKET", value.STORAGE_S3_PRIVATE_BUCKET],
    ["STORAGE_S3_ACCESS_KEY_ID", value.STORAGE_S3_ACCESS_KEY_ID],
    ["STORAGE_S3_SECRET_ACCESS_KEY", value.STORAGE_S3_SECRET_ACCESS_KEY],
    ["MARKET_TRUSTED_PROXY_SECRET", value.MARKET_TRUSTED_PROXY_SECRET],
  ] as const) {
    if (!configured) context.addIssue({ code: "custom", path: [key], message: `${key} is required in production.` });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

function readEnv(): AppEnv {
  return envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    REDIS_URL: process.env.REDIS_URL,
    CUSTOMER_OTP_SMS_PROVIDER: process.env.CUSTOMER_OTP_SMS_PROVIDER,
    CUSTOMER_OTP_SMS_API_URL: process.env.CUSTOMER_OTP_SMS_API_URL,
    CUSTOMER_OTP_SMS_API_KEY: process.env.CUSTOMER_OTP_SMS_API_KEY,
    CUSTOMER_OTP_EMAIL_PROVIDER: process.env.CUSTOMER_OTP_EMAIL_PROVIDER,
    CUSTOMER_OTP_EMAIL_API_URL: process.env.CUSTOMER_OTP_EMAIL_API_URL,
    CUSTOMER_OTP_EMAIL_API_KEY: process.env.CUSTOMER_OTP_EMAIL_API_KEY,
    SPL_PROVIDER: process.env.SPL_PROVIDER,
    SPL_API_BASE_URL: process.env.SPL_API_BASE_URL,
    SPL_API_KEY: process.env.SPL_API_KEY,
    PAYZATY_ACCOUNT_NO: process.env.PAYZATY_ACCOUNT_NO,
    PAYZATY_SECRET_KEY: process.env.PAYZATY_SECRET_KEY,
    PAYZATY_BASE_URL: process.env.PAYZATY_BASE_URL,
    PAYZATY_STATUS_ENDPOINT: process.env.PAYZATY_STATUS_ENDPOINT,
    PAYZATY_SANDBOX: process.env.PAYZATY_SANDBOX,
    MARKET_TRUSTED_COUNTRY_HEADER: process.env.MARKET_TRUSTED_COUNTRY_HEADER,
    MARKET_TRUSTED_PROXY_HEADER: process.env.MARKET_TRUSTED_PROXY_HEADER,
    MARKET_TRUSTED_PROXY_SECRET: process.env.MARKET_TRUSTED_PROXY_SECRET,
    MARKET_DEVELOPMENT_FALLBACK: process.env.MARKET_DEVELOPMENT_FALLBACK,
    UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    PUBLIC_MEDIA_BASE_URL: process.env.PUBLIC_MEDIA_BASE_URL,
    PUBLIC_STORAGE_ROOT: process.env.PUBLIC_STORAGE_ROOT,
    PRIVATE_STORAGE_ROOT: process.env.PRIVATE_STORAGE_ROOT,
    STORAGE_S3_ENDPOINT: process.env.STORAGE_S3_ENDPOINT,
    STORAGE_S3_REGION: process.env.STORAGE_S3_REGION,
    STORAGE_S3_PUBLIC_BUCKET: process.env.STORAGE_S3_PUBLIC_BUCKET,
    STORAGE_S3_PRIVATE_BUCKET: process.env.STORAGE_S3_PRIVATE_BUCKET,
    STORAGE_S3_ACCESS_KEY_ID: process.env.STORAGE_S3_ACCESS_KEY_ID,
    STORAGE_S3_SECRET_ACCESS_KEY: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  });
}

/** Eager validation makes missing required configuration fail at startup. */
export const env = readEnv();
