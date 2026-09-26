import "server-only";

import { PrismaClient, type Category as PrismaCategory } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { getPrismaClient } from "@/database/prisma";
import type { Category, CategoryId, CreateCategoryInput, UpdateCategoryInput } from "../types";
import { resolvePublicMediaUrl } from "@/modules/media/domain/public-url";

type CategoryRecord = PrismaCategory & {
  _count?: { products: number; children: number };
  imageMedia?: { url: string } | null;
  translations?: { locale: "ar" | "en"; name: string; description: string | null }[];
};

async function requestLocale(): Promise<"ar" | "en"> { try { return (await getLocale()) === "en" ? "en" : "ar"; } catch { return "ar"; } }
function toCategory(record: CategoryRecord, children: Category[] = [], locale: "ar" | "en" = "ar"): Category {
  const translation = record.translations?.find((item) => item.locale === locale) ?? record.translations?.find((item) => item.locale === "ar");
  return {
    id: record.id as CategoryId,
    name: translation?.name ?? record.name,
    slug: record.slug,
    parentId: record.parentId as CategoryId | null,
    description: translation?.description ?? record.description,
    imageMediaId: record.imageMediaId,
    imageUrl: resolvePublicMediaUrl(record.imageMedia?.url ?? record.imageUrl),
    isActive: record.isActive,
    showInNavigation: record.showInNavigation,
    sortOrder: record.sortOrder,
    productCount: record._count?.products ?? 0,
    childCount: record._count?.children ?? 0,
    children,
  };
}

export interface CategoryRepository {
  findById(id: CategoryId): Promise<Category | null>;
  findBySlug(slug: string, activeOnly?: boolean): Promise<Category | null>;
  findAll(activeOnly?: boolean): Promise<Category[]>;
  slugExists(slug: string): Promise<boolean>;
  create(input: CreateCategoryInput & { slug: string }): Promise<Category>;
  update(input: UpdateCategoryInput & { slug: string }): Promise<Category>;
  delete(id: CategoryId): Promise<void>;
  hasChildrenOrProducts(id: CategoryId): Promise<boolean>;
  parentChainContains(parentId: CategoryId, categoryId: CategoryId): Promise<boolean>;
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private include = { _count: { select: { products: true, children: true } }, imageMedia: { select: { url: true } }, translations: { select: { locale: true, name: true, description: true } } } as const;

  async findById(id: CategoryId) {
    const locale = await requestLocale();
    const record = await this.db.category.findUnique({ where: { id }, include: this.include });
    return record ? toCategory(record, [], locale) : null;
  }

  async findBySlug(slug: string, activeOnly = false) {
    const locale = await requestLocale();
    const record = await this.db.category.findFirst({ where: { slug, ...(activeOnly ? { isActive: true } : {}) }, include: this.include });
    return record ? toCategory(record, [], locale) : null;
  }

  async slugExists(slug: string) {
    return !!(await this.db.category.findUnique({ where: { slug }, select: { id: true } }));
  }

  async findAll(activeOnly = false) {
    const locale = await requestLocale();
    const records = await this.db.category.findMany({ where: activeOnly ? { isActive: true } : undefined, include: this.include, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return records.map((record) => toCategory(record, [], locale));
  }

  async create(input: CreateCategoryInput & { slug: string }) {
    const record = await this.db.category.create({ data: { name: input.name, slug: input.slug, parentId: input.parentId ?? null, description: input.description ?? null, imageMediaId: input.imageMediaId ?? null, isActive: input.isActive ?? true, showInNavigation: input.showInNavigation ?? true, sortOrder: input.sortOrder ?? 0 }, include: this.include });
    return toCategory(record);
  }

  async update(input: UpdateCategoryInput & { slug: string }) {
    const record = await this.db.category.update({ where: { id: input.id }, data: { name: input.name, slug: input.slug, parentId: input.parentId ?? null, description: input.description ?? null, imageUrl: null, imageMediaId: input.imageMediaId ?? null, ...(input.isActive === undefined ? {} : { isActive: input.isActive }), ...(input.showInNavigation === undefined ? {} : { showInNavigation: input.showInNavigation }), sortOrder: input.sortOrder ?? 0 }, include: this.include });
    return toCategory(record);
  }

  async delete(id: CategoryId) { await this.db.category.delete({ where: { id } }); }

  async hasChildrenOrProducts(id: CategoryId) {
    const record = await this.db.category.findUnique({ where: { id }, select: { _count: { select: { children: true, products: true } } } });
    return !!record && (record._count.children > 0 || record._count.products > 0);
  }

  async parentChainContains(parentId: CategoryId, categoryId: CategoryId) {
    let cursor: string | null = parentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === categoryId) return true;
      if (visited.has(cursor)) return true;
      visited.add(cursor);
      const parent: { parentId: string | null } | null = await this.db.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
      cursor = parent?.parentId ?? null;
    }
    return false;
  }
}
