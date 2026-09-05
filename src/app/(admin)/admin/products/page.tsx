import { getAdminCategories } from "@/modules/categories/server/queries";
import { AdminProductsClient } from "@/modules/products/components/admin-products-client";
import { getAdminProducts } from "@/modules/products/server/queries";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED"; categoryId?: string; page?: string }> }) {
  const query = await searchParams;
  const [products, categories] = await Promise.all([getAdminProducts({ search: query.q, status: query.status, categoryId: query.categoryId, page: Number(query.page) || 1, pageSize: 12 }), getAdminCategories()]);
  if (!products.success) throw products.error;
  if (!categories.success) throw categories.error;
  return <AdminProductsClient initialPage={products.data} categories={categories.data} initialFilters={{ search: query.q ?? "", status: query.status ?? "ALL", categoryId: query.categoryId ?? "ALL" }} />;
}
