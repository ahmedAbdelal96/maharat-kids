import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "@/config/locale";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const messages = (await import(`../../messages/${locale}/index`)).default;

  return { locale, messages, timeZone: "Africa/Cairo" };
});
