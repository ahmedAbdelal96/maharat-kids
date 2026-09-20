import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const customerIdSchema = z.string().trim().min(1);
export const addressIdSchema = z.object({ addressId: customerIdSchema });

export const customerProfileSchema = z.object({
  name: optionalText(120),
  email: z.string().trim().email().max(254),
  phone: optionalText(40),
  marketingConsent: z.boolean().optional(),
});

const addressFormSchema = z.object({
  label: z.string().trim().max(60).optional(),
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  fullAddress: optionalText(500),
  country: optionalText(80),
  countryCode: z.string().trim().length(2).optional(),
  governorate: optionalText(80),
  region: optionalText(80),
  city: optionalText(80),
  district: optionalText(80),
  area: optionalText(80),
  street: optionalText(160),
  building: optionalText(40),
  buildingNumber: optionalText(40),
  additionalNumber: optionalText(40),
  shortAddress: optionalText(40),
  unitNumber: optionalText(40),
  floor: optionalText(40),
  apartment: optionalText(40),
  postalCode: optionalText(30),
  latitude: z.coerce.number().finite().nullable().optional(),
  longitude: z.coerce.number().finite().nullable().optional(),
  notes: optionalText(500),
  isDefault: z.boolean().optional(),
});

function normalizeAddress(input: z.output<typeof addressFormSchema>) {
  return {
    label: input.label?.trim() || "Home",
    recipientName: input.recipientName.trim(),
    phone: input.phone.trim(),
    country: input.country?.trim() || (input.countryCode === "SA" ? "Saudi Arabia" : "Egypt"),
    countryCode: input.countryCode?.toUpperCase() || "EG",
    governorate: input.governorate ?? null,
    region: input.region ?? null,
    city: input.city ?? "",
    district: input.district ?? null,
    area: input.area ?? null,
    street: input.street?.trim() || input.fullAddress?.trim() || "",
    building: input.building ?? null,
    buildingNumber: input.buildingNumber ?? null,
    additionalNumber: input.additionalNumber ?? null,
    shortAddress: input.shortAddress ?? null,
    unitNumber: input.unitNumber ?? null,
    floor: input.floor ?? null,
    apartment: input.apartment ?? null,
    postalCode: input.postalCode ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    notes: input.notes ?? null,
    isDefault: input.isDefault === true,
  };
}

// The browser-facing form stays short. This transform keeps the existing
// CustomerAddress persistence shape without requiring a schema migration.
export const addressSchema = addressFormSchema.transform(normalizeAddress);

export const updateAddressSchema = addressFormSchema
  .extend({ addressId: z.string().trim().min(1) })
  .transform(({ addressId, ...input }) => ({ addressId, ...normalizeAddress(input) }));

export const changeCustomerPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12),
    confirmPassword: z.string().min(12),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const updateCustomerStatusSchema = z.object({
  customerId: customerIdSchema,
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});
