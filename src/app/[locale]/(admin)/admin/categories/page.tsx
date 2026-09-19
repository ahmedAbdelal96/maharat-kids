import { getAdminCategories } from "@/modules/categories/server/queries";
import { AdminCategoriesClient } from "@/modules/categories/components/admin-categories-client";

export default async function AdminCategoriesPage() {
  const result = await getAdminCategories();
  if (!result.success) throw result.error;
  return <AdminCategoriesClient initialCategories={result.data} />;
}
