import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GOOGLE_PROVIDER, OAUTH_STATE_COOKIE_NAME } from "@/modules/auth/constants";
import { createDefaultAuthService } from "@/modules/auth/server/queries";
import { exchangeGoogleCode, verifyOAuthState } from "@/modules/auth/providers/google";
import { PrismaOAuthRepository } from "@/modules/auth/infrastructure/oauth-repository";
import type { User } from "@/modules/identity/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const storedState = (await cookies()).get(OAUTH_STATE_COOKIE_NAME)?.value;
  const returnTo = state && storedState === state ? verifyOAuthState(state) : null;
  const fallback = new URL("/login?error=google_failed", request.url);

  if (!returnTo || !code) return NextResponse.redirect(fallback);

  try {
    const profile = await exchangeGoogleCode(code);
    const repository = new PrismaOAuthRepository();
    const linked = await repository.findByProviderAccount(GOOGLE_PROVIDER, profile.sub);
    let user: User | null = linked?.user ?? null;

    if (user?.type === "ADMIN") return NextResponse.redirect(new URL("/login?error=google_admin_account", request.url));

    if (!user) {
      user = await repository.findUserByEmail(profile.email);

      if (user?.type === "ADMIN") return NextResponse.redirect(new URL("/login?error=google_admin_account", request.url));
      if (user) {
        await repository.linkAccount({ userId: user.id, provider: GOOGLE_PROVIDER, providerAccountId: profile.sub });
      } else {
        user = await repository.createCustomer({ email: profile.email, provider: GOOGLE_PROVIDER, providerAccountId: profile.sub });
      }
    }

    const session = await createDefaultAuthService().createSessionForUser(user.id);
    if (!session.success) return NextResponse.redirect(fallback);

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return response;
  } catch {
    return NextResponse.redirect(fallback);
  }
}
