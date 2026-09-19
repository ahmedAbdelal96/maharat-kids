import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { isGoogleConfigured, createOAuthState, googleCallbackUrl } from "@/modules/auth/providers/google";
import { OAUTH_STATE_COOKIE_NAME } from "@/modules/auth/constants";

export async function GET(request: Request) {
  const settings = await getPublicStoreSettings();
  const enabled = settings.success && settings.data.googleEnabled;

  if (!isGoogleConfigured(enabled)) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const url = new URL(request.url);
  const state = createOAuthState(url.searchParams.get("callbackUrl") ?? url.searchParams.get("returnTo") ?? undefined);
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  }).toString();

  const redirectResponse = NextResponse.redirect(authorization);
  redirectResponse.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: state,
    expires: new Date(Date.now() + 10 * 60 * 1000),
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return redirectResponse;
}
