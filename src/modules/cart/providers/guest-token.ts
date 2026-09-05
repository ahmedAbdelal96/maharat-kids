import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { GUEST_CART_COOKIE_NAME, GUEST_CART_TTL_DAYS } from "../constants";

const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidGuestToken(token: string | undefined): token is string {
  return Boolean(token && tokenPattern.test(token));
}

export async function getGuestToken(): Promise<string | null> {
  const token = (await cookies()).get(GUEST_CART_COOKIE_NAME)?.value;
  return isValidGuestToken(token) ? token : null;
}

export async function setGuestToken(token: string): Promise<void> {
  const expires = new Date(Date.now() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000);
  (await cookies()).set({
    name: GUEST_CART_COOKIE_NAME,
    value: token,
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearGuestToken(): Promise<void> {
  (await cookies()).delete(GUEST_CART_COOKIE_NAME);
}
