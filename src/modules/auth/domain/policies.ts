import { UnauthorizedError } from "@/core/errors";

import { INVALID_LOGIN_MESSAGE } from "../constants";

export function invalidLoginError(): UnauthorizedError {
  return new UnauthorizedError(INVALID_LOGIN_MESSAGE);
}

export function isSafeReturnTo(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://internal.local");
    const allowed = ["/products", "/categories", "/cart", "/checkout", "/account", "/admin", "/login", "/register", "/forgot-password", "/reset-password"];
    return parsed.origin === "https://internal.local" && (parsed.pathname === "/" || allowed.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)));
  } catch {
    return false;
  }
}

export function loginPathForReturnTo(value: string): string {
  return `/login?callbackUrl=${encodeURIComponent(isSafeReturnTo(value) ? value : "/account")}`;
}

export function isAuthenticationRequiredError(error: { code?: unknown; message?: unknown }): boolean {
  return error.code === "UNAUTHORIZED" || error.message === "Authentication is required.";
}

export function isCustomerAccessRequiredError(error: { code?: unknown; message?: unknown }): boolean {
  return isAuthenticationRequiredError(error) || error.code === "FORBIDDEN" || error.message === "Please sign in with a customer account to continue." || error.message === "A customer account is required for this page.";
}
