import { Badge } from "@/components/ui/badge";
import { CategoryGrid } from "@/components/ecommerce/category-grid";
import { getPublicCategories } from "@/modules/categories/server/queries";
import type { Metadata } from "next";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { storeMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();
  const t = await getTranslations("storefront");
  return settings.success ? storeMetadata(settings.data, { title: `${t("viewAllCategories")} | ${settings.data.name}`, description: t("categoryDescription"), alternates: { canonical: "/categories" } }) : {};
}

export default async function CategoriesPage() {
  const result = await getPublicCategories();
  if (!result.success) throw result.error;
  const roots = result.data.filter((category) => category.parentId === null);
  const t = await getTranslations("storefront");
  return <div className="space-y-8"><div className="border-b border-[var(--border)] pb-6"><Badge variant="secondary" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">{t("collections")}</Badge><h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t("viewAllCategories")}</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">{t("categoryDescription")}</p></div><CategoryGrid categories={roots} /></div>;
}
