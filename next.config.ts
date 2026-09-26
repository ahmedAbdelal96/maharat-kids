import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const publicMediaPattern = (() => {
  const value = process.env.PUBLIC_MEDIA_BASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const pathname = url.pathname.replace(/\/$/, "");
    return { protocol: "https" as const, hostname: url.hostname, pathname: `${pathname || ""}/**` };
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // Market is determined by a trusted request header; prevent an intermediary
      // or browser router cache from reusing one market's rendered currency.
      { key: "Cache-Control", value: "private, no-store" },
      { key: "Vary", value: "x-vercel-ip-country" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/(.*)", headers }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      ...(publicMediaPattern ? [publicMediaPattern] : []),
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
