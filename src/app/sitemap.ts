import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicOffers } from "@/modules/promotions/server/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, firstProducts, offersResult] = await Promise.all([
    getPublicCategories(),
    getPublicProducts({ page: 1, pageSize: 48 }),
    getPublicOffers(),
  ]);
  const products = firstProducts.success
    ? [
        ...firstProducts.data.items,
        ...(await Promise.all(
          Array.from({ length: Math.max(0, firstProducts.data.totalPages - 1) }, (_, index) =>
            getPublicProducts({ page: index + 2, pageSize: 48 }),
          ),
        )).flatMap((result) => result.success ? result.data.items : []),
      ]
    : [];
  const offers = offersResult.success ? offersResult.data : [];

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/categories"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/offers"), changeFrequency: "daily", priority: 0.8 },
    ...(categories.success ? categories.data.map((category) => ({ url: absoluteUrl(`/categories/${category.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })) : []),
    ...products.map((product) => ({ url: absoluteUrl(`/products/${product.slug}`), lastModified: new Date(product.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...offers.map((offer) => ({ url: absoluteUrl(`/offers/${offer.slug}`), lastModified: new Date(offer.updatedAt), changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
