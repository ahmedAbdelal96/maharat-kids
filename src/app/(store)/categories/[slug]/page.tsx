import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CategoryGrid } from "@/components/ecommerce/category-grid";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import { Breadcrumbs } from "@/components/ecommerce/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, breadcrumbJsonLd, storeMetadata } from "@/lib/seo";
import { getPublicCategories, getPublicCategory } from "@/modules/categories/server/queries";
import { getPublicProducts } from "@/modules/products/server/queries";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [category, settings] = await Promise.all([getPublicCategory(slug), getPublicStoreSettings()]);
  if (!category.success || !settings.success || !category.data) return {};
  const title = `${category.data.name} | ${settings.data.name}`;
  const description = category.data.description || `Explore products in ${category.data.name}.`;
  const url = absoluteUrl(`/categories/${category.data.slug}`);
  return storeMetadata(settings.data, { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website", images: category.data.imageUrl ? [{ url: absoluteUrl(category.data.imageUrl), alt: category.data.name }] : undefined } });
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, allCategories, products, settings, favoriteIds] = await Promise.all([getPublicCategory(slug), getPublicCategories(), getPublicProducts({ categorySlug: slug, pageSize: 48 }), getPublicStoreSettings(), getCurrentCustomerFavoriteIds()]);
  if (!category.success) throw category.error;
  if (!allCategories.success) throw allCategories.error;
  if (!products.success) throw products.error;
  if (!settings.success) throw settings.error;
  if (!category.data) notFound();
  const current = category.data;
  const children = allCategories.data.filter((item) => item.parentId === current.id);
  const byId = new Map(allCategories.data.map((item) => [item.id, item]));
  const breadcrumbs = [];
  let cursor: typeof current | null = current;
  while (cursor) { breadcrumbs.unshift(cursor); cursor = cursor.parentId ? byId.get(cursor.parentId) ?? null : null; }
  const breadcrumbItems = [{ name: "Home", href: "/" }, { name: "Categories", href: "/categories" }, ...breadcrumbs.map((item) => ({ name: item.name, href: `/categories/${item.slug}` }))];
  return <div className="space-y-10"><Breadcrumbs items={breadcrumbItems} /><JsonLd data={breadcrumbJsonLd(breadcrumbItems)} /><section className="grid items-center gap-8 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)] sm:p-10 lg:grid-cols-[minmax(0,1fr)_20rem]"><div><Badge variant="secondary" size="sm">Category</Badge><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{current.name}</h1>{current.description && <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{current.description}</p>}<p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{current.childCount} subcategories · {products.data.total} direct products</p></div><div className="relative mx-auto aspect-[4/3] w-full max-w-xs overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-muted)] lg:mx-0 lg:justify-self-end"><Image src={current.imageUrl || "/placeholders/category-placeholder.svg"} alt={current.name} fill priority sizes="(max-width: 1024px) 100vw, 20rem" className="object-cover transition-transform duration-700 hover:scale-105" /></div></section>{children.length > 0 && <section className="space-y-5"><div><Badge variant="secondary" size="sm">Explore further</Badge><h2 className="mt-2 text-2xl font-bold">Child Categories</h2></div><CategoryGrid categories={children} /></section>}<section className="space-y-5"><div className="flex items-end justify-between"><div><Badge variant="secondary" size="sm">Direct catalog</Badge><h2 className="mt-2 text-2xl font-bold">Products in {current.name}</h2></div><span className="text-xs text-[var(--text-secondary)]">{products.data.total} products</span></div>{products.data.items.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">No active products are directly assigned to this category.</p> : <ProductGrid products={products.data.items} currency={settings.data.currency} favoriteProductIds={favoriteIds} columns={3} />}</section></div>;
}
