import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { getMarketConfiguration, type Market } from "@/modules/market/domain/market";

export type ShippingQuoteAddress = { market: Market; countryCode: string };

export type ShippingQuote = {
  carrierId: string;
  carrierCode: string;
  carrierNameAr: string;
  carrierNameEn: string;
  market: Market;
  currency: "SAR" | "EGP";
  amount: Prisma.Decimal;
  source: "ADMIN_CONFIGURED";
};

export type ShippingQuoteRequest = {
  market: Market;
  address?: ShippingQuoteAddress | null;
};

type ShippingQuoteDb = Pick<PrismaClient, "shippingCarrierMarketConfig">;

export class ShippingQuoteError extends Error {
  constructor(public readonly code: "ADDRESS_MARKET_MISMATCH" | "SHIPPING_UNAVAILABLE" | "SHIPPING_CONFIGURATION_AMBIGUOUS" | "SHIPPING_RATE_INVALID", message = code) {
    super(message);
    this.name = "ShippingQuoteError";
  }
}

/**
 * Admin-configured flat-rate provider. The provider boundary is intentionally
 * independent from checkout so a live carrier adapter can replace it later.
 */
export class ConfiguredRateShippingProvider {
  constructor(private readonly db: ShippingQuoteDb = getPrismaClient()) {}

  async quote(input: ShippingQuoteRequest): Promise<ShippingQuote> {
    if (input.address && input.address.market !== input.market) throw new ShippingQuoteError("ADDRESS_MARKET_MISMATCH");

    const configurations = await this.db.shippingCarrierMarketConfig.findMany({
      where: {
        market: input.market,
        enabled: true,
        isCheckoutCarrier: true,
        shippingCompany: { isActive: true },
      },
      include: { shippingCompany: true },
      orderBy: { updatedAt: "desc" },
    });

    if (configurations.length === 0) throw new ShippingQuoteError("SHIPPING_UNAVAILABLE");
    if (configurations.length > 1) throw new ShippingQuoteError("SHIPPING_CONFIGURATION_AMBIGUOUS");

    const configuration = configurations[0];
    if (configuration.rate.lt(0)) throw new ShippingQuoteError("SHIPPING_RATE_INVALID");
    const marketConfiguration = getMarketConfiguration(input.market);
    const carrier = configuration.shippingCompany;

    return {
      carrierId: carrier.id,
      carrierCode: carrier.code,
      carrierNameAr: carrier.nameAr?.trim() || carrier.name,
      carrierNameEn: carrier.nameEn?.trim() || carrier.name,
      market: input.market,
      currency: marketConfiguration.currency,
      amount: configuration.rate,
      source: "ADMIN_CONFIGURED",
    };
  }
}

export function resolveShippingQuote(input: ShippingQuoteRequest, db?: ShippingQuoteDb) {
  return new ConfiguredRateShippingProvider(db).quote(input);
}
