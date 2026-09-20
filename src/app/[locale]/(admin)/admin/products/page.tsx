import { getAdminCategories } from "@/modules/categories/server/queries";
import { AdminProductsClient } from "@/modules/products/components/admin-products-client";
import { getAdminProducts } from "@/modules/products/server/queries";
import { getCatalogTaxonomy } from "@/modules/catalog/server/queries";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED"; categoryId?: string; page?: string }> }) {
  const query = await searchParams;
  const [products, categories, skills, objectives, productTypes, useContexts, ageGroups] = await Promise.all([getAdminProducts({ search: query.q, status: query.status, categoryId: query.categoryId, page: Number(query.page) || 1, pageSize: 12 }), getAdminCategories(), getCatalogTaxonomy("skill", true), getCatalogTaxonomy("objective", true), getCatalogTaxonomy("productType", true), getCatalogTaxonomy("useContext", true), getCatalogTaxonomy("ageGroup", true)]);
  if (!products.success) throw products.error;
  if (!categories.success) throw categories.error;
  return <AdminProductsClient initialPage={products.data} categories={categories.data} taxonomy={{ skills, objectives, productTypes, useContexts, ageGroups }} initialFilters={{ search: query.q ?? "", status: query.status ?? "ALL", categoryId: query.categoryId ?? "ALL" }} />;
}
