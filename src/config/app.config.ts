export const appConfig = {
  name: "Ecommerce Framework",
  description: "A reusable, feature-based ecommerce foundation.",
  defaultLocale: "en",
  defaultRevalidateSeconds: 300,
} as const;

export type AppConfig = typeof appConfig;
