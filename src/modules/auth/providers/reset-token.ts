import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "@/config/env";
import { PASSWORD_RESET_COOKIE_NAME } from "../constants";

type ResetTokenPayload = { codeId: string; userId: string; expiresAt: number };

function sign(value: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
}

export function createResetToken(codeId: string, userId: string, expiresAt: Date): string {
  const payload = `${codeId}.${userId}.${expiresAt.getTime()}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyResetToken(token: string): ResetTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 5) return null;

  const payload = parts.slice(0, 4).join(".");
  const expected = sign(payload);
  const actual = parts[4];

  if (expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return null;
  }

  const [codeId, userId, expiresAtText] = parts;
  const expiresAt = Number(expiresAtText);

  if (!codeId || !userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  return { codeId, userId, expiresAt };
}

export async function setResetToken(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set({
    name: PASSWORD_RESET_COOKIE_NAME,
    value: token,
    expires: expiresAt,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getResetToken(): Promise<string | undefined> {
  return (await cookies()).get(PASSWORD_RESET_COOKIE_NAME)?.value;
}

export async function clearResetToken(): Promise<void> {
  (await cookies()).delete(PASSWORD_RESET_COOKIE_NAME);
}
