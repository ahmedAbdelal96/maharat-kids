import { BlogCategoriesClient } from "@/modules/blog/components/blog-categories-client";
import { getAdminBlogCategories } from "@/modules/blog/server/queries";

export default async function AdminBlogCategoriesPage() {
  const result = await getAdminBlogCategories();
  if (!result.success) throw result.error;
  return <BlogCategoriesClient initial={result.data} />;
}
