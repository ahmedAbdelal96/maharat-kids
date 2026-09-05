import type { Metadata } from "next";
import type { ReactNode } from "react";

import { env } from "@/config/env";
import { appConfig } from "@/config/app.config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    template: `%s | ${appConfig.name}`,
    default: appConfig.name,
  },
  description: appConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: appConfig.name,
    description: appConfig.description,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
