import "server-only";
import { PrismaClient, type BlogPostStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { resolvePublicMediaUrl } from "@/modules/media/domain/public-url";
import { sanitizeBlogHtml } from "../domain/sanitize";
import type { BlogCategory, BlogCategoryInput, BlogPost, BlogPostInput, BlogPostPage } from "../types";

type Db = PrismaClient;
const categorySelect = { id: true, nameAr: true, nameEn: true, slug: true, isActive: true, sortOrder: true } as const;
const include = { coverMedia: { select: { url: true } }, category: { select: categorySelect }, products: { select: { productId: true } }, storeCategories: { select: { categoryId: true } } } as const;
type RecordWithRelations = Awaited<ReturnType<PrismaClient["blogPost"]["findFirst"]>> & { coverMedia?: { url: string } | null; category?: BlogCategory | null; products: { productId: string }[]; storeCategories: { categoryId: string }[] };

function toPost(record: RecordWithRelations): BlogPost {
  return { id: record.id, titleAr: record.titleAr, titleEn: record.titleEn, excerptAr: record.excerptAr, excerptEn: record.excerptEn, contentAr: record.contentAr, contentEn: record.contentEn, slug: record.slug, status: record.status, coverMediaId: record.coverMediaId, coverUrl: resolvePublicMediaUrl(record.coverMedia?.url), seoTitleAr: record.seoTitleAr, seoTitleEn: record.seoTitleEn, seoDescriptionAr: record.seoDescriptionAr, seoDescriptionEn: record.seoDescriptionEn, publishedAt: record.publishedAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), category: record.category ?? null, productIds: record.products.map((item) => item.productId), storeCategoryIds: record.storeCategories.map((item) => item.categoryId) };
}

export class BlogRepository {
  constructor(private readonly db: Db = getPrismaClient()) {}
  async findPublicPosts(categorySlug?: string, page = 1, pageSize = 12): Promise<BlogPostPage> {
    const where = { status: "PUBLISHED" as BlogPostStatus, ...(categorySlug ? { category: { slug: categorySlug, isActive: true } } : {}) };
    const [total, records] = await Promise.all([this.db.blogPost.count({ where }), this.db.blogPost.findMany({ where, include, orderBy: { publishedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize })]);
    return { items: records.map((record) => toPost(record as unknown as RecordWithRelations)), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
  async findPublicBySlug(slug: string) { const record = await this.db.blogPost.findFirst({ where: { slug, status: "PUBLISHED" }, include }); return record ? toPost(record as unknown as RecordWithRelations) : null; }
  async findAdminPosts(page = 1, pageSize = 20): Promise<BlogPostPage> { const [total, records] = await Promise.all([this.db.blogPost.count(), this.db.blogPost.findMany({ include, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize })]); return { items: records.map((record) => toPost(record as unknown as RecordWithRelations)), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }; }
  async findCategories(activeOnly = false) { return this.db.blogCategory.findMany({ where: activeOnly ? { isActive: true } : undefined, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: categorySelect }); }
  async findCategoryBySlug(slug: string, activeOnly = true) { return this.db.blogCategory.findFirst({ where: { slug, ...(activeOnly ? { isActive: true } : {}) }, select: categorySelect }); }
  async createCategory(input: BlogCategoryInput & { slug: string }) { return this.db.blogCategory.create({ data: { ...input, slug: input.slug, isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0 }, select: categorySelect }); }
  async updateCategory(id: string, input: BlogCategoryInput & { slug: string }) { return this.db.blogCategory.update({ where: { id }, data: { ...input, slug: input.slug, isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0 }, select: categorySelect }); }
  async deletePost(id: string) { return this.db.blogPost.update({ where: { id }, data: { status: "DRAFT", publishedAt: null } }); }
  async createPost(input: BlogPostInput & { slug: string }) { return this.savePost(null, input); }
  async updatePost(id: string, input: BlogPostInput & { slug: string }) { return this.savePost(id, input); }
  private async savePost(id: string | null, input: BlogPostInput & { slug: string }) {
    const [category, products, categories, cover] = await Promise.all([
      input.categoryId ? this.db.blogCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }) : null,
      this.db.product.findMany({ where: { id: { in: input.productIds ?? [] }, status: "ACTIVE" }, select: { id: true } }),
      this.db.category.findMany({ where: { id: { in: input.storeCategoryIds ?? [] }, isActive: true }, select: { id: true } }),
      input.coverMediaId ? this.db.media.findUnique({ where: { id: input.coverMediaId }, select: { id: true, mimeType: true } }) : null,
    ]);
    if (input.categoryId && !category) throw new Error("BLOG_CATEGORY_INVALID");
    if (products.length !== new Set(input.productIds ?? []).size) throw new Error("BLOG_PRODUCT_INVALID");
    if (categories.length !== new Set(input.storeCategoryIds ?? []).size) throw new Error("BLOG_STORE_CATEGORY_INVALID");
    if (cover && !cover.mimeType.startsWith("image/")) throw new Error("BLOG_COVER_INVALID");
    const data = { titleAr: input.titleAr.trim(), titleEn: input.titleEn.trim(), excerptAr: input.excerptAr?.trim() || null, excerptEn: input.excerptEn?.trim() || null, contentAr: sanitizeBlogHtml(input.contentAr), contentEn: sanitizeBlogHtml(input.contentEn), slug: input.slug, status: input.status ?? "DRAFT" as BlogPostStatus, coverMediaId: input.coverMediaId ?? null, categoryId: input.categoryId ?? null, seoTitleAr: input.seoTitleAr?.trim() || null, seoTitleEn: input.seoTitleEn?.trim() || null, seoDescriptionAr: input.seoDescriptionAr?.trim() || null, seoDescriptionEn: input.seoDescriptionEn?.trim() || null, publishedAt: input.status === "PUBLISHED" ? new Date() : null };
    return this.db.$transaction(async (tx) => {
      const post = id ? await tx.blogPost.update({ where: { id }, data, include }) : await tx.blogPost.create({ data, include });
      await tx.blogPostProduct.deleteMany({ where: { postId: post.id } });
      await tx.blogPostStoreCategory.deleteMany({ where: { postId: post.id } });
      if (products.length) await tx.blogPostProduct.createMany({ data: products.map((item) => ({ postId: post.id, productId: item.id })), skipDuplicates: true });
      if (categories.length) await tx.blogPostStoreCategory.createMany({ data: categories.map((item) => ({ postId: post.id, categoryId: item.id })), skipDuplicates: true });
      const complete = await tx.blogPost.findUniqueOrThrow({ where: { id: post.id }, include });
      return toPost(complete as unknown as RecordWithRelations);
    });
  }
}
