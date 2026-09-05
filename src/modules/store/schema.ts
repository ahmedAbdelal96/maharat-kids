import { z } from "zod";

export const settingKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/);

export const updateSettingSchema = z.object({
  key: settingKeySchema,
  value: z.unknown(),
});

export const bulkUpdateSettingsSchema = z.array(updateSettingSchema).min(1);

export const supportedCurrencyCodes = ["USD", "EGP", "SAR"] as const;
export const supportedCurrencies = [
  { code: "USD", label: "الدولار الأمريكي (USD)" },
  { code: "EGP", label: "الجنيه المصري (EGP)" },
  { code: "SAR", label: "الريال السعودي (SAR)" },
] as const;
export const supportedLocales = ["en", "es", "fr", "de"] as const;

export const storeSettingsUpdateSchema = z.object({
  name: z.string().trim().min(1, "Store name is required."),
  email: z.union([z.literal(""), z.string().trim().email()]),
  phone: z.string().trim(),
  currency: z.enum(supportedCurrencyCodes),
  language: z.enum(supportedLocales),
  seoTitle: z.string().trim(),
  seoDescription: z.string().trim(),
  googleEnabled: z.boolean(),
  maxActiveOffers: z.coerce.number().int().min(1).max(100).default(10),
  maxHeroOffers: z.coerce.number().int().min(1).max(10).default(3),
  returnsEnabled: z.boolean(),
  returnsWindowDays: z.coerce.number().int().min(1).max(365),
  returnsPolicyText: z.string().trim().max(2000),
});
