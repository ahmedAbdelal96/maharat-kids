import { getAdminCategories } from "@/modules/categories/server/queries";
import { getAdminProducts } from "@/modules/products/server/queries";
import { BlogAdminClient } from "@/modules/blog/components/blog-admin-client";
import { getAdminBlogCategories, getAdminBlogPosts } from "@/modules/blog/server/queries";

export default async function AdminBlogPage() {
  const [posts, blogCategories, products, storeCategories] = await Promise.all([
    getAdminBlogPosts(),
    getAdminBlogCategories(),
    getAdminProducts({ page: 1, pageSize: 48, status: "ACTIVE" }),
    getAdminCategories(),
  ]);
  if (!posts.success) throw posts.error;
  if (!blogCategories.success) throw blogCategories.error;
  if (!products.success) throw products.error;
  if (!storeCategories.success) throw storeCategories.error;
  return <BlogAdminClient posts={posts.data.items} categories={blogCategories.data} products={products.data.items} storeCategories={storeCategories.data} />;
}
