import type { Metadata } from "next";

import { env } from "@/config/env";
import type { Product } from "@/modules/products/types";
import type { StoreSettings } from "@/modules/store/types";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function absoluteUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

export function storeMetadata(settings: StoreSettings, overrides: Metadata = {}): Metadata {
  const title = settings.seoTitle || settings.name;
  const description = settings.seoDescription || `${settings.name} catalog and online shopping.`;

  return {
    title,
    description,
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    openGraph: {
      title,
      description,
      siteName: settings.name,
      type: "website",
      url: absoluteUrl("/"),
    },
    ...overrides,
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function organizationJsonLd(settings: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.name,
    url: absoluteUrl("/"),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
  };
}

export function productJsonLd(product: Product, settings: StoreSettings, rating?: { average: number; count: number }) {
  const available = !product.trackInventory || product.stockQuantity > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.shortDescription || `${product.name} from ${settings.name}.`,
    url: absoluteUrl(`/products/${product.slug}`),
    image: product.images.filter((image) => image.url).map((image) => absoluteUrl(image.url)),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: settings.currency,
      price: product.price,
      availability: `https://schema.org/${available ? "InStock" : "OutOfStock"}`,
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(rating && rating.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average.toFixed(1), reviewCount: rating.count } } : {}),
  };
}
