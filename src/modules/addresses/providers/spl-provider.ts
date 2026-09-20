import "server-only";

import type { Market } from "@prisma/client";
import type { AddressResolutionChallenge, AddressResolutionProvider, ResolvedAddressChoice } from "./types";

/** Production boundary. Endpoint/payload details must be supplied by the subscribed SPL integration. */
export class SplAddressResolutionProvider implements AddressResolutionProvider {
  async begin(_input: { customerId: string; market: Market; phone: string }): Promise<AddressResolutionChallenge> {
    void _input;
    throw new Error("ADDRESS_PROVIDER_UNAVAILABLE");
  }

  async verify(_input: { customerId: string; market: Market; providerSessionReference: string; code: string }): Promise<ResolvedAddressChoice[]> {
    void _input;
    throw new Error("ADDRESS_PROVIDER_UNAVAILABLE");
  }
}
