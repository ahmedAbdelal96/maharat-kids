import "server-only";

import type { Market } from "@prisma/client";
import { env } from "@/config/env";
import type { AddressResolutionChallenge, AddressResolutionProvider, ResolvedAddressChoice } from "./types";

const DEVELOPMENT_CODE = "246810";

export class DevelopmentAddressResolutionProvider implements AddressResolutionProvider {
  constructor() {
    if (env.NODE_ENV === "production") throw new Error("ADDRESS_PROVIDER_UNAVAILABLE");
  }

  async begin(input: { customerId: string; market: Market; phone: string }): Promise<AddressResolutionChallenge> {
    if (input.market !== "SAUDI_ARABIA") throw new Error("ADDRESS_PROVIDER_UNAVAILABLE");
    return { provider: "DEVELOPMENT", providerSessionReference: `dev-${input.customerId}-${Date.now()}`, challengeCode: DEVELOPMENT_CODE };
  }

  async verify(input: { customerId: string; market: Market; providerSessionReference: string; code: string }): Promise<ResolvedAddressChoice[]> {
    if (input.market !== "SAUDI_ARABIA" || input.code !== DEVELOPMENT_CODE || !input.providerSessionReference.startsWith(`dev-${input.customerId}-`)) throw new Error("ADDRESS_RESOLUTION_INVALID");
    return [
      { recipientName: "MK-02 Recipient", phone: "+966551234567", country: "Saudi Arabia", countryCode: "SA", region: "Riyadh", city: "Riyadh", district: "Al Olaya", street: "King Fahd Road", buildingNumber: "10", additionalNumber: "1234", shortAddress: "ABCD1234", unitNumber: null, postalCode: "12345", latitude: 24.7136, longitude: 46.6753, providerReference: `${input.providerSessionReference}-1` },
      { recipientName: "MK-02 Recipient", phone: "+966551234567", country: "Saudi Arabia", countryCode: "SA", region: "Riyadh", city: "Riyadh", district: "Al Malaz", street: "Prince Fahd Street", buildingNumber: "22", additionalNumber: "4321", shortAddress: "EFGH5678", unitNumber: null, postalCode: "12836", latitude: 24.6877, longitude: 46.7219, providerReference: `${input.providerSessionReference}-2` },
    ];
  }
}
