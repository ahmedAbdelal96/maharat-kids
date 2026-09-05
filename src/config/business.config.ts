export const businessTypes = [
  "fashion",
  "electronics",
  "auto-parts",
  "food",
  "furniture",
  "general",
] as const;

export type BusinessType = (typeof businessTypes)[number];

export type BusinessFeatures = {
  reviews: boolean;
  wishlist: boolean;
  inventory: boolean;
  subscriptions: boolean;
};

export type BusinessConfig = {
  businessType: BusinessType;
  features: BusinessFeatures;
};

export const businessConfig = {
  businessType: "general",
  features: {
    reviews: true,
    wishlist: true,
    inventory: true,
    subscriptions: false,
  },
} satisfies BusinessConfig;
