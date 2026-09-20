import type { Market } from "@prisma/client";
import type { UserId, UserStatus } from "@/modules/identity/types";
import type { z } from "zod";

import {
  addressSchema,
  changeCustomerPasswordSchema,
  customerProfileSchema,
  updateAddressSchema,
  updateCustomerStatusSchema,
} from "./schema";

export type CustomerId = UserId;

export type CustomerProfile = {
  id: CustomerId;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  firstLoginAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  marketingConsent: boolean;
  marketingConsentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  addressCount: number;
};

export type CustomerAddress = {
  id: string;
  userId: CustomerId;
  market: Market;
  countryCode: string;
  label: string;
  recipientName: string;
  phone: string;
  country: string;
  governorate: string | null;
  region: string | null;
  city: string;
  district: string | null;
  area: string | null;
  street: string;
  building: string | null;
  buildingNumber: string | null;
  additionalNumber: string | null;
  shortAddress: string | null;
  unitNumber: string | null;
  floor: string | null;
  apartment: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  source: "MANUAL" | "SPL";
  verification: "UNVERIFIED" | "VERIFIED";
  provider: string | null;
  providerReference: string | null;
  consentAt: Date | null;
  verifiedAt: Date | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerAccountData = {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  hasLocalPassword: boolean;
  orders?: import("@/modules/orders/types").OrderSummary[];
  favorites?: import("@/modules/favorites/types").FavoriteProduct[];
  notifications?: import("@/modules/notifications/types").CustomerNotification[];
  unreadNotificationCount?: number;
  reviewData?: import("@/modules/reviews/types").CustomerReviewsPage;
};

export type AdminCustomer = CustomerProfile;
export type AdminCustomerDetails = CustomerProfile & { addresses: CustomerAddress[] };

export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type AddressFormInput = {
  label?: string;
  recipientName: string;
  phone: string;
  fullAddress?: string;
  country?: string | null;
  countryCode?: string | null;
  governorate?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  area?: string | null;
  street?: string | null;
  building?: string | null;
  buildingNumber?: string | null;
  additionalNumber?: string | null;
  shortAddress?: string | null;
  unitNumber?: string | null;
  floor?: string | null;
  apartment?: string | null;
  postalCode?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  notes?: string | null;
  isDefault?: boolean;
};
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type ChangeCustomerPasswordInput = z.infer<typeof changeCustomerPasswordSchema>;
export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;
