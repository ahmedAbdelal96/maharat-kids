import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { CustomerIdentityChannel, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { env } from "@/config/env";
import { normalizeEmail } from "@/modules/identity/domain/rules";
import type { Market } from "@/modules/market/domain/market";
import { getOtpDeliveryProvider, type OtpLocale, type OtpDeliveryProviderRegistry } from "../providers/otp-delivery";

export const OTP_CONFIG = { digits: 6, ttlMs: 5 * 60_000, resendCooldownMs: 60_000, maxAttempts: 5, destinationWindowMs: 15 * 60_000, destinationLimit: 5 } as const;

export function normalizeSaudiPhone(input: string): string {
  const digits = input.trim().replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("966") ? digits.slice(3) : digits;
  const local = national.startsWith("0") ? national.slice(1) : national;
  if (!/^5\d{8}$/.test(local)) throw new Error("IDENTITY_INVALID");
  return `+966${local}`;
}

export function normalizeCustomerDestination(market: Market, value: string) {
  return market === "SAUDI_ARABIA"
    ? { channel: CustomerIdentityChannel.PHONE, destination: normalizeSaudiPhone(value) }
    : { channel: CustomerIdentityChannel.EMAIL, destination: normalizeEmail(value.trim()) };
}

function safeHashEqual(a: string, b: string) { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
export function generateOtp(): string { return randomInt(0, 1_000_000).toString().padStart(OTP_CONFIG.digits, "0"); }
export function hashOtp(code: string): string { return createHmac("sha256", env.AUTH_SECRET).update(code).digest("hex"); }

export class CustomerOtpService {
  constructor(private readonly db: PrismaClient = getPrismaClient(), private readonly providerRegistry?: OtpDeliveryProviderRegistry) {}

  async request(market: Market, rawDestination: string, sourceHash?: string, locale: OtpLocale = "ar", correlationId?: string) {
    const { channel, destination } = normalizeCustomerDestination(market, rawDestination);
    const now = new Date();
    const since = new Date(now.getTime() - OTP_CONFIG.destinationWindowMs);
    const [latest, count] = await Promise.all([
      this.db.otpChallenge.findFirst({ where: { channel, destination, purpose: "CUSTOMER_AUTH" }, orderBy: { createdAt: "desc" } }),
      this.db.otpChallenge.count({ where: { channel, destination, createdAt: { gte: since } } }),
    ]);
    if (latest && latest.resendAvailableAt > now) return { accepted: true, retryAfterSeconds: Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000) };
    if (count >= OTP_CONFIG.destinationLimit) return { accepted: true, retryAfterSeconds: Math.ceil((since.getTime() + OTP_CONFIG.destinationWindowMs - now.getTime()) / 1000) };
    const configuredDevelopmentCode = process.env.MK_E2E_OTP_CODE;
    const code = env.NODE_ENV !== "production" && configuredDevelopmentCode && /^\d{6}$/.test(configuredDevelopmentCode) ? configuredDevelopmentCode : generateOtp();
    const challenge = await this.db.$transaction(async (tx) => {
      await tx.otpChallenge.updateMany({ where: { channel, destination, purpose: "CUSTOMER_AUTH", consumedAt: null }, data: { consumedAt: now } });
      return tx.otpChallenge.create({ data: { channel, destination, codeHash: hashOtp(code), expiresAt: new Date(now.getTime() + OTP_CONFIG.ttlMs), resendAvailableAt: new Date(now.getTime() + OTP_CONFIG.resendCooldownMs), requestSourceHash: sourceHash ?? null } });
    });
    try {
      const deliveryChannel = channel === CustomerIdentityChannel.EMAIL ? "EMAIL" : "SMS";
      const provider = getOtpDeliveryProvider(deliveryChannel, this.providerRegistry);
      const delivery = await provider.send({ channel: deliveryChannel, destination, otp: code, locale, purpose: "LOGIN", expiresInMinutes: OTP_CONFIG.ttlMs / 60_000, correlationId });
      if (!delivery.accepted) throw new Error("OTP_DELIVERY_REJECTED");
      return { accepted: true, retryAfterSeconds: OTP_CONFIG.resendCooldownMs / 1000, ...(env.NODE_ENV !== "production" && provider.name === "console" ? { developmentCode: code } : {}) };
    } catch (error) {
      await this.db.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
      throw error;
    }
  }

  async verify(market: Market, rawDestination: string, code: string) {
    const { channel, destination } = normalizeCustomerDestination(market, rawDestination);
    if (!/^\d{6}$/.test(code)) throw new Error("OTP_INVALID");
    const now = new Date();
    const challenge = await this.db.otpChallenge.findFirst({ where: { channel, destination, purpose: "CUSTOMER_AUTH", consumedAt: null }, orderBy: { createdAt: "desc" } });
    if (!challenge || challenge.expiresAt <= now || challenge.attemptCount >= OTP_CONFIG.maxAttempts || !safeHashEqual(challenge.codeHash, hashOtp(code))) {
      if (challenge) {
        await this.db.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attemptCount: { lt: OTP_CONFIG.maxAttempts } }, data: { attemptCount: { increment: 1 } } });
      }
      throw new Error("OTP_INVALID");
    }
    return this.db.$transaction(async (tx) => {
      const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attemptCount: { lt: OTP_CONFIG.maxAttempts } }, data: { consumedAt: now } });
      if (consumed.count !== 1) throw new Error("OTP_INVALID");
      const existing = await tx.customerIdentity.findUnique({ where: { channel_normalizedValue: { channel, normalizedValue: destination } }, include: { user: true } });
      if (existing) return existing.user;
      const user = await tx.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: channel === "EMAIL" ? destination : null, phone: channel === "PHONE" ? destination : null, passwordHash: null } });
      await tx.customerIdentity.create({ data: { userId: user.id, channel, normalizedValue: destination, verifiedAt: now } });
      return user;
    });
  }
}
