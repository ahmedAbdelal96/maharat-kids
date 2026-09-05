import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";
import { isSafeReturnTo } from "../domain/policies";

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
};

export function isGoogleConfigured(enabled: boolean): boolean {
  return enabled && Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleCallbackUrl(): string {
  return new URL("/auth/google/callback", env.NEXT_PUBLIC_APP_URL).toString();
}

export function createOAuthState(returnTo: string | undefined): string {
  const safeReturnTo = isSafeReturnTo(returnTo) ? returnTo : "/account";
  const nonce = randomBytes(24).toString("base64url");
  const payload = `${nonce}.${Buffer.from(safeReturnTo).toString("base64url")}`;
  const signature = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  const actual = parts[2];

  if (expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return null;

  try {
    const returnTo = Buffer.from(parts[1], "base64url").toString("utf8");
    return isSafeReturnTo(returnTo) ? returnTo : "/account";
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google credentials are not configured.");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleCallbackUrl(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) throw new Error("Google token exchange failed.");
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google access token was not returned.");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!profileResponse.ok) throw new Error("Google profile lookup failed.");
  const profile = (await profileResponse.json()) as GoogleProfile;

  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    throw new Error("Google account email is not verified.");
  }

  return { ...profile, email: profile.email.trim().toLowerCase() };
}
