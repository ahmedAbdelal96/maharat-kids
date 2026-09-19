import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/ar/admin", "/en/admin", "/ar/account", "/en/account", "/ar/cart", "/en/cart", "/ar/checkout", "/en/checkout"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
