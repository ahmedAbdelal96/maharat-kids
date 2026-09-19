import { isLocale, type Locale } from "@/config/locale";

/** Remove the locale prefix before passing a path to next-intl navigation. */
export function stripLocalePrefix(path: string): string {
  const result = path.match(/^\/(ar|en)(?=\/|$)(.*)$/);
  return result ? result[2] || "/" : path;
}

/** Add a locale prefix to a safe internal path for server redirects and URLs. */
export function withLocalePrefix(path: string, locale: Locale): string {
  const normalized = stripLocalePrefix(path);
  return `/${locale}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function localeFromPath(path: string): Locale | undefined {
  const value = path.split("?")[0].split("/")[1];
  return isLocale(value) ? value : undefined;
}
