/**
 * Utility functions for formatting currencies, numbers, and dates
 * with support for configurable store settings.
 */

export function formatCurrency(
  amountInCents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: locale.startsWith("ar") ? "name" : "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoney(
  amount: string | number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: locale.startsWith("ar") ? "name" : "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(typeof amount === "number" ? amount : Number(amount));
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-US",
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const hasStyle = Boolean(options?.dateStyle || options?.timeStyle);
  const formatterOptions = hasStyle
    ? options
    : { year: "numeric" as const, month: "short" as const, day: "numeric" as const, ...options };
  return new Intl.DateTimeFormat(locale, formatterOptions).format(d);
}

export function formatNumber(
  num: number,
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale).format(num);
}
