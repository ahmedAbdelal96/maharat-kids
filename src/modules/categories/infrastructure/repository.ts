import "server-only";

import { PrismaClient, type Category as PrismaCategory } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { Category, CategoryId, CreateCategoryInput, UpdateCategoryInput } from "../types";

type CategoryRecord = PrismaCategory & {
  _count?: { products: number; children: number };
  imageMedia?: { url: string } | null;
};

function toCategory(record: CategoryRecord, children: Category[] = []): Category {
  return {
    id: record.id as CategoryId,
    name: record.name,
    slug: record.slug,
    parentId: record.parentId as CategoryId | null,
    description: record.description,
    imageMediaId: record.imageMediaId,
    imageUrl: record.imageMedia?.url ?? record.imageUrl,
    isActive: record.isActive,
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

  private include = { _count: { select: { products: true, children: true } }, imageMedia: { select: { url: true } } } as const;

  async findById(id: CategoryId) {
    const record = await this.db.category.findUnique({ where: { id }, include: this.include });
    return record ? toCategory(record) : null;
  }

  async findBySlug(slug: string, activeOnly = false) {
    const record = await this.db.category.findFirst({ where: { slug, ...(activeOnly ? { isActive: true } : {}) }, include: this.include });
    return record ? toCategory(record) : null;
  }

  async slugExists(slug: string) {
    return !!(await this.db.category.findUnique({ where: { slug }, select: { id: true } }));
  }

  async findAll(activeOnly = false) {
    const records = await this.db.category.findMany({ where: activeOnly ? { isActive: true } : undefined, include: this.include, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return records.map((record) => toCategory(record));
  }

  async create(input: CreateCategoryInput & { slug: string }) {
    const record = await this.db.category.create({ data: { name: input.name, slug: input.slug, parentId: input.parentId ?? null, description: input.description ?? null, imageMediaId: input.imageMediaId ?? null, isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0 }, include: this.include });
    return toCategory(record);
  }

  async update(input: UpdateCategoryInput & { slug: string }) {
    const record = await this.db.category.update({ where: { id: input.id }, data: { name: input.name, slug: input.slug, parentId: input.parentId ?? null, description: input.description ?? null, imageUrl: null, imageMediaId: input.imageMediaId ?? null, ...(input.isActive === undefined ? {} : { isActive: input.isActive }), sortOrder: input.sortOrder ?? 0 }, include: this.include });
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
