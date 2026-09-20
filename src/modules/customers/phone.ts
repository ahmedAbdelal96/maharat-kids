import type { Market } from "@prisma/client";

import { normalizeSaudiPhone } from "@/modules/auth/domain/customer-otp";

export function normalizeEgyptPhone(input: string): string {
  const digits = input.trim().replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("20") ? digits.slice(2) : digits;
  const local = national.startsWith("0") ? national : `0${national}`;
  if (!/^01[0125]\d{8}$/.test(local)) throw new Error("ADDRESS_PHONE_INVALID");
  return `+20${local.slice(1)}`;
}

export function normalizeAddressPhone(market: Market, input: string): string {
  return market === "SAUDI_ARABIA" ? normalizeSaudiPhone(input) : normalizeEgyptPhone(input);
}
