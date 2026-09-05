export const providerSlots = ["auth", "theme", "query", "toast"] as const;
export type ProviderSlot = (typeof providerSlots)[number];
