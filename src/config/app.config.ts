export const appConfig = {
  name: "Maharat Kids",
  arabicName: "مهارة طفل",
  description: "Learning, play, and thoughtful tools for growing minds.",
  defaultLocale: "ar",
  currency: "SAR",
  defaultRevalidateSeconds: 300,
} as const;

export type AppConfig = typeof appConfig;
