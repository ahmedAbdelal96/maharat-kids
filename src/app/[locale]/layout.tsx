import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { env } from "@/config/env";
import { appConfig } from "@/config/app.config";
import { isLocale, localeDirection, localeToIntl, type Locale } from "@/config/locale";
import { getMessages, getTranslations } from "next-intl/server";

import "../globals.css";

const baseMetadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    template: `%s | ${appConfig.name}`,
    default: appConfig.name,
  },
  description: appConfig.description,
  openGraph: {
    title: appConfig.name,
    description: appConfig.description,
    type: "website",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const language = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: language, namespace: "common" });
  return {
    ...baseMetadata,
    title: { template: `%s | ${appConfig.name}`, default: `${appConfig.name} | ${t("frameworkTitle")}` },
    description: t("frameworkDescription"),
    alternates: { canonical: `/${language}`, languages: { ar: "/ar", en: "/en", "x-default": "/ar" } },
    openGraph: { ...baseMetadata.openGraph, title: `${appConfig.name} | ${t("frameworkTitle")}`, description: t("frameworkDescription"), locale: localeToIntl(language) },
  };
}

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
