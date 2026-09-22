import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getPublicCategories } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicOffers } from "@/modules/promotions/server/queries";
import { getPublicBlogCategories, getPublicBlogPosts } from "@/modules/blog/server/queries";
import { locales, type Locale } from "@/config/locale";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, firstProducts, offersResult, blogCategories, firstBlogPosts] = await Promise.all([
    getPublicCategories(),
    getPublicProducts({ page: 1, pageSize: 48 }),
    getPublicOffers(),
    getPublicBlogCategories(),
    getPublicBlogPosts(undefined, 1),
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
  const blogPosts = firstBlogPosts.success
    ? [...firstBlogPosts.data.items, ...(await Promise.all(Array.from({ length: Math.max(0, firstBlogPosts.data.totalPages - 1) }, (_, index) => getPublicBlogPosts(undefined, index + 2)))).flatMap((result) => result.success ? result.data.items : [])]
    : [];

  return locales.flatMap((locale: Locale) => [
    { url: absoluteUrl(`/${locale}`), changeFrequency: "daily" as const, priority: 1 },
    { url: absoluteUrl(`/${locale}/categories`), changeFrequency: "daily" as const, priority: 0.8 },
    { url: absoluteUrl(`/${locale}/products`), changeFrequency: "daily" as const, priority: 0.8 },
    { url: absoluteUrl(`/${locale}/offers`), changeFrequency: "daily" as const, priority: 0.8 },
    { url: absoluteUrl(`/${locale}/blog`), changeFrequency: "daily" as const, priority: 0.7 },
    ...(categories.success ? categories.data.map((category) => ({ url: absoluteUrl(`/${locale}/categories/${category.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })) : []),
    ...products.map((product) => ({ url: absoluteUrl(`/${locale}/products/${product.slug}`), lastModified: new Date(product.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...offers.map((offer) => ({ url: absoluteUrl(`/${locale}/offers/${offer.slug}`), lastModified: new Date(offer.updatedAt), changeFrequency: "daily" as const, priority: 0.7 })),
    ...(blogCategories.success ? blogCategories.data.map((category) => ({ url: absoluteUrl(`/${locale}/blog/category/${category.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })) : []),
    ...blogPosts.map((post) => ({ url: absoluteUrl(`/${locale}/blog/${post.slug}`), lastModified: new Date(post.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
  ]);
}
