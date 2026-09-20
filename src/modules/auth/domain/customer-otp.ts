import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { CustomerIdentityChannel, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { env } from "@/config/env";
import { normalizeEmail } from "@/modules/identity/domain/rules";
import type { Market } from "@/modules/market/domain/market";

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

function hashCode(code: string) { return createHmac("sha256", env.AUTH_SECRET).update(code).digest("hex"); }
function safeHashEqual(a: string, b: string) { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
function otp() { return randomInt(0, 1_000_000).toString().padStart(OTP_CONFIG.digits, "0"); }

export class CustomerOtpService {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async request(market: Market, rawDestination: string, sourceHash?: string) {
    // This repository has no production delivery credential. Refuse before a usable
    // challenge is created so production never silently becomes a local-code provider.
    if (env.NODE_ENV === "production") throw new Error("OTP_PROVIDER_UNAVAILABLE");
    const { channel, destination } = normalizeCustomerDestination(market, rawDestination);
    const now = new Date();
    const since = new Date(now.getTime() - OTP_CONFIG.destinationWindowMs);
    const [latest, count] = await Promise.all([
      this.db.otpChallenge.findFirst({ where: { channel, destination, purpose: "CUSTOMER_AUTH" }, orderBy: { createdAt: "desc" } }),
      this.db.otpChallenge.count({ where: { channel, destination, createdAt: { gte: since } } }),
    ]);
    if (latest && latest.resendAvailableAt > now) return { accepted: true, retryAfterSeconds: Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000) };
    if (count >= OTP_CONFIG.destinationLimit) return { accepted: true, retryAfterSeconds: Math.ceil((since.getTime() + OTP_CONFIG.destinationWindowMs - now.getTime()) / 1000) };
    const code = otp();
    await this.db.otpChallenge.create({ data: { channel, destination, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + OTP_CONFIG.ttlMs), resendAvailableAt: new Date(now.getTime() + OTP_CONFIG.resendCooldownMs), requestSourceHash: sourceHash ?? null } });
    return { accepted: true, retryAfterSeconds: OTP_CONFIG.resendCooldownMs / 1000, developmentCode: code };
  }

  async verify(market: Market, rawDestination: string, code: string) {
    const { channel, destination } = normalizeCustomerDestination(market, rawDestination);
    if (!/^\d{6}$/.test(code)) throw new Error("OTP_INVALID");
    const now = new Date();
    const challenge = await this.db.otpChallenge.findFirst({ where: { channel, destination, purpose: "CUSTOMER_AUTH", consumedAt: null }, orderBy: { createdAt: "desc" } });
    if (!challenge || challenge.expiresAt <= now || challenge.attemptCount >= OTP_CONFIG.maxAttempts || !safeHashEqual(challenge.codeHash, hashCode(code))) {
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
