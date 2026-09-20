import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Market, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import { env } from "@/config/env";
import { normalizeSaudiPhone } from "@/modules/auth/domain/customer-otp";

import type { AddressResolutionProvider, ResolvedAddressChoice } from "../providers/types";

const TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const hashCode = (value: string) => createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class AddressResolutionService {
  constructor(private readonly db: PrismaClient = getPrismaClient(), private readonly provider: AddressResolutionProvider) {}

  async start(customerId: string, market: Market, rawPhone: string, consent: boolean) {
    if (market !== "SAUDI_ARABIA") throw new Error("ADDRESS_PROVIDER_UNAVAILABLE");
    if (!consent) throw new Error("ADDRESS_CONSENT_REQUIRED");
    const phone = normalizeSaudiPhone(rawPhone);
    const now = new Date();
    const pending = await this.db.addressResolutionSession.findFirst({ where: { customerId, market, status: "PENDING", expiresAt: { gt: now } }, orderBy: { createdAt: "desc" } });
    if (pending) throw new Error("ADDRESS_RESOLUTION_COOLDOWN");
    const challenge = await this.provider.begin({ customerId, market, phone });
    const session = await this.db.addressResolutionSession.create({ data: { customerId, market, provider: challenge.provider, recipientPhone: phone, providerSessionReference: challenge.providerSessionReference, challengeHash: challenge.challengeCode ? hashCode(challenge.challengeCode) : null, consentAt: now, expiresAt: new Date(now.getTime() + TTL_MS) } });
    return { sessionId: session.id, provider: challenge.provider, developmentCode: challenge.challengeCode };
  }

  async verify(customerId: string, sessionId: string, code: string): Promise<ResolvedAddressChoice[]> {
    const session = await this.db.addressResolutionSession.findFirst({ where: { id: sessionId, customerId } });
    const now = new Date();
    if (!session || session.status !== "PENDING" || session.expiresAt <= now || !session.providerSessionReference || session.attemptCount >= MAX_ATTEMPTS) throw new Error("ADDRESS_RESOLUTION_INVALID");
    if (session.challengeHash && !safeEqual(session.challengeHash, hashCode(code))) {
      await this.db.addressResolutionSession.updateMany({ where: { id: session.id, status: "PENDING", attemptCount: { lt: MAX_ATTEMPTS } }, data: { attemptCount: { increment: 1 } } });
      throw new Error("ADDRESS_RESOLUTION_INVALID");
    }
    let choices: ResolvedAddressChoice[];
    try {
      choices = await this.provider.verify({ customerId, market: session.market, providerSessionReference: session.providerSessionReference, code });
    } catch (error) {
      await this.db.addressResolutionSession.updateMany({ where: { id: session.id, status: "PENDING", attemptCount: { lt: MAX_ATTEMPTS } }, data: { attemptCount: { increment: 1 } } });
      throw error;
    }
    await this.db.addressResolutionSession.updateMany({ where: { id: session.id, status: "PENDING" }, data: { status: "VERIFIED", verifiedAt: now, choices: choices as object[] } });
    return choices;
  }

  async saveChoice(customerId: string, sessionId: string, choiceIndex: number, label = "National Address") {
    const session = await this.db.addressResolutionSession.findFirst({ where: { id: sessionId, customerId, status: "VERIFIED", completedAt: null } });
    if (!session || !Array.isArray(session.choices) || !Number.isInteger(choiceIndex)) throw new Error("ADDRESS_RESOLUTION_INVALID");
    const choice = session.choices[choiceIndex] as unknown as ResolvedAddressChoice | undefined;
    if (!choice) throw new Error("ADDRESS_RESOLUTION_INVALID");
    const address = await this.db.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({ where: { userId: customerId, market: "SAUDI_ARABIA" }, data: { isDefault: false } });
      const created = await tx.customerAddress.create({ data: { userId: customerId, market: "SAUDI_ARABIA", countryCode: "SA", label, recipientName: choice.recipientName, phone: choice.phone, country: choice.country, governorate: null, region: choice.region, city: choice.city, district: choice.district, area: choice.district, street: choice.street, building: choice.buildingNumber, buildingNumber: choice.buildingNumber, additionalNumber: choice.additionalNumber, shortAddress: choice.shortAddress, unitNumber: choice.unitNumber, floor: null, apartment: null, postalCode: choice.postalCode, latitude: choice.latitude, longitude: choice.longitude, notes: null, source: "SPL", verification: "VERIFIED", provider: session.provider, providerReference: choice.providerReference, consentAt: session.consentAt, verifiedAt: session.verifiedAt, isDefault: true } });
      await tx.addressResolutionSession.update({ where: { id: session.id }, data: { completedAt: new Date() } });
      return created;
    });
    return { ...address, latitude: address.latitude?.toString() ?? null, longitude: address.longitude?.toString() ?? null };
  }
}
