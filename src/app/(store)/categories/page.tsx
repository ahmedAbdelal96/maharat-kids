import { Badge } from "@/components/ui/badge";
import { CategoryGrid } from "@/components/ecommerce/category-grid";
import { getPublicCategories } from "@/modules/categories/server/queries";
import type { Metadata } from "next";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { storeMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();
  return settings.success ? storeMetadata(settings.data, { title: `Categories | ${settings.data.name}`, description: `Browse the categories in ${settings.data.name}.`, alternates: { canonical: "/categories" } }) : {};
}

export default async function CategoriesPage() {
  const result = await getPublicCategories();
  if (!result.success) throw result.error;
  const roots = result.data.filter((category) => category.parentId === null);
  return <div className="space-y-8"><div className="border-b border-[var(--border)] pb-6"><Badge variant="secondary" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">Collections</Badge><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Explore Categories</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Browse the active store catalog hierarchy.</p></div><CategoryGrid categories={roots} /></div>;
}
