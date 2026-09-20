import type { Market } from "@prisma/client";

export type ResolvedAddressChoice = {
  recipientName: string;
  phone: string;
  country: "Saudi Arabia";
  countryCode: "SA";
  region: string;
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  additionalNumber: string | null;
  shortAddress: string;
  unitNumber: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  providerReference: string;
};

export type AddressResolutionChallenge = {
  provider: string;
  providerSessionReference: string;
  challengeCode?: string;
};

export interface AddressResolutionProvider {
  begin(input: { customerId: string; market: Market; phone: string }): Promise<AddressResolutionChallenge>;
  verify(input: { customerId: string; market: Market; providerSessionReference: string; code: string }): Promise<ResolvedAddressChoice[]>;
}
