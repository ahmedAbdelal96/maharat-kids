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
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().max(25 * 1024 * 1024).default(5 * 1024 * 1024),
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
    UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES,
  });
}

/** Eager validation makes missing required configuration fail at startup. */
export const env = readEnv();
