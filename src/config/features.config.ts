export const featureNames = [
  "auth",
  "products",
  "categories",
  "orders",
  "customers",
  "inventory",
  "payments",
  "shipping",
] as const;

export type FeatureName = (typeof featureNames)[number];

export const defaultFeatures: Record<FeatureName, boolean> = {
  auth: true,
  products: true,
  categories: true,
  orders: true,
  customers: true,
  inventory: true,
  payments: true,
  shipping: true,
};

export function isFeatureEnabled(feature: FeatureName): boolean {
  return defaultFeatures[feature];
}
