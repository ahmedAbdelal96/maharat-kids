'use server';

import "server-only";

import { ValidationError } from "@/core/errors";
import { AppError } from "@/core/errors";
import { failure, success } from "@/core/result";
import { getRequestId } from "@/server/observability";
import { checkRateLimit } from "@/server/rate-limit";

import { createDefaultAuthService } from "./queries";
import { loginSchema, logoutSchema } from "../schema";
import { clearGuestToken } from "@/modules/cart/providers/guest-token";

export async function login(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter a valid email and password.", { issues: parsed.error.issues }));
  const requestId = await getRequestId();
  const limit = checkRateLimit(`auth:login:${parsed.data.email}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) return failure(new AppError("RATE_LIMITED", "Too many attempts. Please try again later.", { requestId }));
  const result = await createDefaultAuthService().login(parsed.data);
  if (result.success && result.data.user.type === "CUSTOMER") {
    return failure(new AppError("CUSTOMER_PASSWORD_AUTH_RETIRED", "Customer password sign-in is no longer available. Use the one-time code flow."));
  }
  return result;
}

export async function registerCustomer(input: unknown) {
  void input;
  return failure(new AppError("CUSTOMER_PASSWORD_AUTH_RETIRED", "Customer password registration is no longer available. Use the one-time code flow."));
  /*
  const parsed = registerCustomerSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError(parsed.error.issues[0]?.message ?? "Please review the account details.", { issues: parsed.error.issues }));
  const requestId = await getRequestId();
  const limit = checkRateLimit(`auth:register:${parsed.data.email}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    logger.warn("Authentication rate limit reached", { requestId, operation: "register", retryAfterSeconds: limit.retryAfterSeconds });
    return failure(new AppError("RATE_LIMITED", "Too many attempts. Please try again later.", { requestId }));
  }
  const result = await createDefaultAuthService().registerCustomer(parsed.data);
  if (result.success) {
    const merge = await mergeGuestCartForCustomer(result.data.user.id);
    if (!merge.success) logger.warn("Guest cart merge failed after registration", { requestId, code: merge.error.code });
  }
  return result; */
}

export async function logout(sessionId: unknown) {
  const parsed = logoutSchema.safeParse(sessionId);
  if (!parsed.success) return failure(new ValidationError("The session could not be signed out."));
  const result = await createDefaultAuthService().logout(parsed.data);
  if (result.success) await clearGuestToken();
  return result;
}

export async function logoutCurrentUser() {
  const current = await createDefaultAuthService().getCurrentUser();

  if (!current.success) return failure(current.error);
  if (!current.data) return success(true);

  const result = await createDefaultAuthService().logout(current.data.session.id);
  if (result.success) await clearGuestToken();
  return result;
}

export async function requestPasswordReset(input: unknown) {
  void input;
  return failure(new AppError("CUSTOMER_PASSWORD_AUTH_RETIRED", "Customer password recovery is no longer available."));
  /*
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter a valid email address.", { issues: parsed.error.issues }));
  const requestId = await getRequestId();
  const limit = checkRateLimit(`auth:reset-request:${parsed.data.email}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    logger.warn("Authentication rate limit reached", { requestId, operation: "password-reset-request", retryAfterSeconds: limit.retryAfterSeconds });
    return success("If an account exists for this email, a verification code has been sent.");
  }
  return createDefaultPasswordResetService().requestCode(parsed.data); */
}

export async function verifyPasswordResetCode(input: unknown) {
  void input;
  return failure(new AppError("CUSTOMER_PASSWORD_AUTH_RETIRED", "Customer password recovery is no longer available."));
  /*
  const parsed = verifyPasswordResetCodeSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter the 6-digit verification code.", { issues: parsed.error.issues }));
  const requestId = await getRequestId();
  const limit = checkRateLimit(`auth:reset-verify:${parsed.data.email}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    logger.warn("Authentication rate limit reached", { requestId, operation: "password-reset-verify", retryAfterSeconds: limit.retryAfterSeconds });
    return failure(new AppError("RATE_LIMITED", "Too many attempts. Please request a new code.", { requestId }));
  }
  return createDefaultPasswordResetService().verifyCode(parsed.data); */
}

export async function resetPassword(input: unknown) {
  void input;
  return failure(new AppError("CUSTOMER_PASSWORD_AUTH_RETIRED", "Customer password recovery is no longer available."));
  /*
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review the new password.", { issues: parsed.error.issues }));
  const requestId = await getRequestId();
  const limit = checkRateLimit("auth:reset-password", { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    logger.warn("Authentication rate limit reached", { requestId, operation: "password-reset-save", retryAfterSeconds: limit.retryAfterSeconds });
    return failure(new AppError("RATE_LIMITED", "Too many attempts. Please try again later.", { requestId }));
  }
  return createDefaultPasswordResetService().resetPassword(parsed.data); */
}
