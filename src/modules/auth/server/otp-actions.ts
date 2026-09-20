"use server";
import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { failure, success } from "@/core/result";
import { AppError, ValidationError } from "@/core/errors";
import { resolveMarket } from "@/modules/market/server/resolver";
import { CustomerOtpService } from "../domain/customer-otp";
import { createDefaultAuthService } from "./queries";
import { mergeGuestCartForCustomer } from "@/modules/cart/server/context";

function sourceHash(value: string | null) { return value ? createHash("sha256").update(value).digest("hex") : undefined; }
export async function requestCustomerOtp(input: { destination?: string }) {
  try {
    if (!input.destination?.trim()) return failure(new ValidationError("Enter your phone number or email address."));
    const market = await resolveMarket();
    const source = sourceHash((await headers()).get("x-forwarded-for") ?? (await headers()).get("x-real-ip"));
    const result = await new CustomerOtpService().request(market.market, input.destination, source);
    return success(result);
  } catch (error) { return failure(new AppError("OTP_REQUEST_FAILED", "If this address can receive a code, it will arrive shortly.", { cause: error })); }
}
export async function verifyCustomerOtp(input: { destination?: string; code?: string }) {
  try {
    if (!input.destination?.trim() || !input.code) return failure(new ValidationError("Enter the six digit code."));
    const market = await resolveMarket();
    const user = await new CustomerOtpService().verify(market.market, input.destination, input.code);
    const authenticated = await createDefaultAuthService().createSessionForUser(user.id as never);
    if (!authenticated.success) return authenticated;
    await mergeGuestCartForCustomer(user.id);
    return success(authenticated.data);
  } catch (error) { return failure(new AppError("OTP_INVALID", "The code is invalid or has expired. Request a new code.", { cause: error })); }
}
