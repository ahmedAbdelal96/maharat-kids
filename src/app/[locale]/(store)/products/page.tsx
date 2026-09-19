import { getPublicCategories } from "@/modules/categories/server/queries";
import { StorefrontProductsClient } from "@/modules/products/components/storefront-products-client";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import type { Metadata } from "next";
import { storeMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();
  const t = await getTranslations("products");
  const storefront = await getTranslations("storefront");
  return settings.success ? storeMetadata(settings.data, { title: `${t("title")} | ${settings.data.name}`, description: storefront("catalogDescription"), alternates: { canonical: "/products" } }) : {};
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string; inStock?: string; page?: string }> }) {
  const query = await searchParams;
  const page = Number(query.page) || 1;
  const [products, categories, settings, favoriteIds] = await Promise.all([getPublicProducts({ search: query.q, categorySlug: query.category, minPrice: query.min, maxPrice: query.max, inStock: query.inStock === "true", page, pageSize: 12 }), getPublicCategories(), getPublicStoreSettings(), getCurrentCustomerFavoriteIds()]);
  if (!products.success) throw products.error;
  if (!categories.success) throw categories.error;
  if (!settings.success) throw settings.error;
  return <StorefrontProductsClient page={products.data} categories={categories.data ?? []} currency={settings.data.currency} favoriteProductIds={favoriteIds} filters={{ search: query.q, categorySlug: query.category, minPrice: query.min, maxPrice: query.max, inStock: query.inStock === "true" }} />;
}
