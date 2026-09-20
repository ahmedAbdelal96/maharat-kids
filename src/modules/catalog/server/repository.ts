import "server-only";
import { getPrismaClient } from "@/database/prisma";
import { Prisma } from "@prisma/client";
import type { PrismaClient, ProductLanguage, DifficultyLevel } from "@prisma/client";
import type { CatalogTaxonomyKind, ProductEducationInput, TaxonomyInput } from "../types";

const modelFor = { skill: "skill", objective: "learningObjective", productType: "productType", useContext: "useContext", ageGroup: "ageGroup" } as const;
export type CatalogTaxonomyRecord = { id: string; slug: string; nameAr: string; nameEn: string; isActive: boolean; sortOrder: number; minAgeMonths?: number; maxAgeMonths?: number; _count?: { products: number } };
type TaxonomyDelegate = { findMany(args: unknown): Promise<CatalogTaxonomyRecord[]>; create(args: unknown): Promise<unknown>; update(args: unknown): Promise<unknown>; findUnique(args: unknown): Promise<unknown>; delete(args: unknown): Promise<unknown> };

export class CatalogRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async listTaxonomy(kind: CatalogTaxonomyKind, activeOnly = false) {
    const model = this.db[modelFor[kind]] as unknown as TaxonomyDelegate;
    return model.findMany({ where: activeOnly ? { isActive: true } : undefined, orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }], include: { _count: { select: { products: true } } } });
  }

  async createTaxonomy(kind: CatalogTaxonomyKind, input: TaxonomyInput) {
    const model = this.db[modelFor[kind]] as unknown as TaxonomyDelegate;
    return model.create({ data: input });
  }

  async updateTaxonomy(kind: CatalogTaxonomyKind, id: string, input: Partial<TaxonomyInput>) {
    const model = this.db[modelFor[kind]] as unknown as TaxonomyDelegate;
    return model.update({ where: { id }, data: input });
  }

  async deleteOrDisableTaxonomy(kind: CatalogTaxonomyKind, id: string) {
    const model = this.db[modelFor[kind]] as unknown as TaxonomyDelegate;
    const current = await model.findUnique({ where: { id }, include: { _count: { select: { products: true } } } }) as { _count: { products: number } } | null;
    if (!current) throw new Error("TAXONOMY_NOT_FOUND");
    if (current._count.products > 0) return model.update({ where: { id }, data: { isActive: false } });
    return model.delete({ where: { id } });
  }

  async saveProductEducation(productId: string, input: ProductEducationInput) {
    const categoryIds = [...new Set(input.categoryIds ?? [])];
    const primaryCategoryId = input.primaryCategoryId ?? categoryIds[0] ?? null;
    if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) categoryIds.push(primaryCategoryId);
    if (input.minAgeMonths != null && input.maxAgeMonths != null && input.minAgeMonths > input.maxAgeMonths) throw new Error("AGE_RANGE_INVALID");
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id: productId }, data: { primaryCategoryId, categoryId: primaryCategoryId, minAgeMonths: input.minAgeMonths ?? null, maxAgeMonths: input.maxAgeMonths ?? null, productLanguage: (input.productLanguage ?? "LANGUAGE_INDEPENDENT") as ProductLanguage, difficultyLevel: (input.difficultyLevel ?? null) as DifficultyLevel | null, materials: input.materials ?? null, numberOfPieces: input.numberOfPieces ?? null, dimensions: input.dimensions ?? null, recommendedPlayers: input.recommendedPlayers ?? null, supervisionRequired: input.supervisionRequired ?? false, safetyNotes: input.safetyNotes ?? null, usageInstructions: input.usageInstructions ?? null }});
      await tx.productCategory.deleteMany({ where: { productId } });
      if (categoryIds.length) await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId, categoryId })), skipDuplicates: true });
      await tx.productSkill.deleteMany({ where: { productId } });
      if ((input.skillIds ?? []).length) await tx.productSkill.createMany({ data: [...new Set(input.skillIds)].map((skillId) => ({ productId, skillId })), skipDuplicates: true });
      await tx.productLearningObjective.deleteMany({ where: { productId } });
      if ((input.learningObjectiveIds ?? []).length) await tx.productLearningObjective.createMany({ data: [...new Set(input.learningObjectiveIds)].map((learningObjectiveId) => ({ productId, learningObjectiveId })), skipDuplicates: true });
      await tx.productProductType.deleteMany({ where: { productId } });
      if ((input.productTypeIds ?? []).length) await tx.productProductType.createMany({ data: [...new Set(input.productTypeIds)].map((productTypeId) => ({ productId, productTypeId })), skipDuplicates: true });
      await tx.productUseContext.deleteMany({ where: { productId } });
      if ((input.useContextIds ?? []).length) await tx.productUseContext.createMany({ data: [...new Set(input.useContextIds)].map((useContextId) => ({ productId, useContextId })), skipDuplicates: true });
      await tx.productAgeGroup.deleteMany({ where: { productId } });
      if ((input.ageGroupIds ?? []).length) await tx.productAgeGroup.createMany({ data: [...new Set(input.ageGroupIds)].map((ageGroupId) => ({ productId, ageGroupId })), skipDuplicates: true });
      return product;
    });
  }

  async findProductEducation(productId: string) {
    return this.db.product.findUnique({ where: { id: productId }, include: { categoryAssignments: { include: { category: true } }, skillAssignments: { include: { skill: true } }, objectiveAssignments: { include: { learningObjective: true } }, productTypeAssignments: { include: { productType: true } }, useContextAssignments: { include: { useContext: true } }, ageGroups: { include: { ageGroup: true } }, primaryCategory: true } });
  }

  async findFilteredProducts(input: { categoryId?: string; ageMonths?: number; skillIds?: string[]; productTypeIds?: string[]; language?: ProductLanguage }) {
    const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];
    if (input.categoryId) and.push({ categoryAssignments: { some: { categoryId: input.categoryId, category: { isActive: true } } } });
    if (input.ageMonths != null) and.push({ minAgeMonths: { lte: input.ageMonths }, maxAgeMonths: { gte: input.ageMonths } });
    if (input.skillIds?.length) and.push({ skillAssignments: { some: { skillId: { in: input.skillIds }, skill: { isActive: true } } } });
    if (input.productTypeIds?.length) and.push({ productTypeAssignments: { some: { productTypeId: { in: input.productTypeIds }, productType: { isActive: true } } } });
    if (input.language) and.push({ productLanguage: input.language });
    return this.db.product.findMany({ where: { AND: and }, include: { categoryAssignments: { include: { category: true } }, skillAssignments: { include: { skill: true } }, productTypeAssignments: { include: { productType: true } }, marketPrices: true }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] });
  }

  async relatedProducts(productId: string, market: "SAUDI_ARABIA" | "EGYPT") {
    const current = await this.findProductEducation(productId);
    if (!current) return [];
    const categoryIds = current.categoryAssignments.map((item) => item.categoryId);
    const skillIds = current.skillAssignments.map((item) => item.skillId);
    const typeIds = current.productTypeAssignments.map((item) => item.productTypeId);
    const ageOverlap = current.minAgeMonths != null && current.maxAgeMonths != null ? { minAgeMonths: { lte: current.maxAgeMonths }, maxAgeMonths: { gte: current.minAgeMonths } } : undefined;
    return this.db.product.findMany({ where: { id: { not: productId }, status: "ACTIVE", marketPrices: { some: { market } }, OR: [{ categoryAssignments: { some: { categoryId: { in: categoryIds } } } }, { skillAssignments: { some: { skillId: { in: skillIds } } } }, { productTypeAssignments: { some: { productTypeId: { in: typeIds } } } }, ...(ageOverlap ? [ageOverlap] : []), { productLanguage: current.productLanguage }] }, take: 8, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], include: { marketPrices: true } });
  }
}
