import "server-only";

import { Prisma, PrismaClient, type Product as PrismaProduct } from "@prisma/client";
import { getLocale } from "next-intl/server";
import { getPrismaClient } from "@/database/prisma";
import { getApprovedRatingSummaries } from "@/modules/reviews/infrastructure/rating-aggregation";
import { AuditLogService } from "@/modules/audit/domain/service";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import type { AuditMutationContext } from "@/modules/audit/types";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/repository";
import type { Product, ProductId, CreateProductInput, ProductImageInput, ProductPage, ProductQuery, UpdateProductInput } from "../types";

const imageInclude = { orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }, { createdAt: "asc" as const }] };
type ProductRecord = PrismaProduct & {
  category: { name: string; slug: string; translations?: { locale: "ar" | "en"; name: string }[] } | null;
  translations?: { locale: "ar" | "en"; name: string; shortDescription: string | null; description: string | null }[];
  images: { id: string; mediaId: string | null; url: string | null; altText: string | null; sortOrder: number; isPrimary: boolean; media: { url: string } | null }[];
};
function money(value: Prisma.Decimal | null): string | null { return value?.toFixed(2) ?? null; }
async function requestLocale(): Promise<"ar" | "en"> { try { return (await getLocale()) === "en" ? "en" : "ar"; } catch { return "ar"; } }
function toProduct(record: ProductRecord, locale: "ar" | "en" = "ar"): Product { const translation = record.translations?.find((item) => item.locale === locale) ?? record.translations?.find((item) => item.locale === "ar"); const categoryTranslation = record.category?.translations?.find((item) => item.locale === locale) ?? record.category?.translations?.find((item) => item.locale === "ar"); return { id: record.id as ProductId, name: translation?.name ?? record.name, slug: record.slug, shortDescription: translation?.shortDescription ?? record.shortDescription, description: translation?.description ?? record.description, sku: record.sku, price: record.price.toFixed(2), compareAtPrice: money(record.compareAtPrice), status: record.status, isFeatured: record.isFeatured, categoryId: record.categoryId, categoryName: categoryTranslation?.name ?? record.category?.name ?? null, categorySlug: record.category?.slug ?? null, trackInventory: record.trackInventory, stockQuantity: record.stockQuantity, images: record.images.map((image) => ({ id: image.id, mediaId: image.mediaId, url: image.media?.url ?? image.url ?? "", altText: image.altText, sortOrder: image.sortOrder, isPrimary: image.isPrimary })), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() }; }
function imageData(images: ProductImageInput[] | undefined) { const normalized = (images ?? []).map((image, index) => ({ mediaId: image.mediaId, altText: image.altText ?? null, sortOrder: image.sortOrder ?? index, isPrimary: image.isPrimary ?? index === 0 })); const primaryIndex = normalized.findIndex((image) => image.isPrimary); return normalized.map((image, index) => ({ ...image, isPrimary: primaryIndex < 0 ? index === 0 : index === primaryIndex })); }

export interface ProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  findByIds(ids: ProductId[]): Promise<Product[]>;
  findBySlug(slug: string, publicOnly?: boolean): Promise<Product | null>;
  findPublic(input: ProductQuery): Promise<ProductPage>;
  findAdmin(input?: ProductQuery): Promise<ProductPage>;
  slugExists(slug: string): Promise<boolean>;
  skuExists(sku: string): Promise<boolean>;
  getHighestGeneratedSkuNumber(): Promise<number>;
  create(input: CreateProductInput & { slug: string; sku: string | null }): Promise<Product>;
  update(input: UpdateProductInput & { slug: string; sku: string | null }): Promise<Product>;
  setStatus(id: ProductId, status: "ACTIVE" | "ARCHIVED"): Promise<Product>;
  adjustStock(id: ProductId, quantityDelta: number, audit?: AuditMutationContext): Promise<Product>;
  hasOrderHistory(id: ProductId): Promise<boolean>;
  delete(id: ProductId): Promise<void>;
  categoryExists(id: string): Promise<boolean>;
  findPurchasableByIds(ids: string[]): Promise<Product[]>;
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}
  private audit = new AuditLogService(new PrismaAuditLogRepository());
  private include = { category: { select: { name: true, slug: true, translations: { select: { locale: true, name: true } } } }, translations: { select: { locale: true, name: true, shortDescription: true, description: true } }, images: { ...imageInclude, include: { media: { select: { url: true } } } } } as const;
  private async withApprovedRatings(records: ProductRecord[], locale: "ar" | "en"): Promise<Product[]> {
    if (records.length === 0) return [];
    const summaries = await getApprovedRatingSummaries(this.db, records.map((record) => record.id));
    return records.map((record) => {
      const product = toProduct(record, locale);
      const ratingSummary = summaries.get(record.id);
      return ratingSummary ? { ...product, ratingSummary } : product;
    });
  }
  async findById(id: ProductId) { const locale = await requestLocale(); const record = await this.db.product.findUnique({ where: { id }, include: this.include }); return record ? toProduct(record as ProductRecord, locale) : null; }
  async findByIds(ids: ProductId[]) { if (ids.length === 0) return []; const locale = await requestLocale(); const records = await this.db.product.findMany({ where: { id: { in: ids } }, include: this.include }); return this.withApprovedRatings(records as ProductRecord[], locale); }
  async findBySlug(slug: string, publicOnly = false) { const locale = await requestLocale(); const record = await this.db.product.findFirst({ where: { slug, ...(publicOnly ? { status: "ACTIVE" } : {}) }, include: this.include }); return record ? toProduct(record as ProductRecord, locale) : null; }
  async slugExists(slug: string) { return !!(await this.db.product.findUnique({ where: { slug }, select: { id: true } })); }
  async skuExists(sku: string) { return !!(await this.db.product.findUnique({ where: { sku }, select: { id: true } })); }
  async getHighestGeneratedSkuNumber() {
    const records = await this.db.product.findMany({ where: { sku: { startsWith: "PRODUCT-" } }, select: { sku: true } });
    return records.reduce((highest, record) => {
      const value = Number(record.sku?.slice("PRODUCT-".length));
      return Number.isInteger(value) ? Math.max(highest, value) : highest;
    }, 0);
  }
  async findPublic(input: ProductQuery): Promise<ProductPage> { const locale = await requestLocale(); const page = input.page ?? 1; const pageSize = input.pageSize ?? 24; const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }]; if (input.featured !== undefined) and.push({ isFeatured: input.featured }); if (input.search) and.push({ OR: [{ name: { contains: input.search, mode: "insensitive" } }, { sku: { contains: input.search, mode: "insensitive" } }, { shortDescription: { contains: input.search, mode: "insensitive" } }, { translations: { some: { locale, name: { contains: input.search, mode: "insensitive" } } } }] }); if (input.categorySlug) and.push({ category: { slug: input.categorySlug, isActive: true } }); if (input.minPrice || input.maxPrice) and.push({ price: { ...(input.minPrice ? { gte: new Prisma.Decimal(input.minPrice) } : {}), ...(input.maxPrice ? { lte: new Prisma.Decimal(input.maxPrice) } : {}) } }); if (input.inStock) and.push({ OR: [{ trackInventory: false }, { trackInventory: true, stockQuantity: { gt: 0 } }] }); const where: Prisma.ProductWhereInput = { AND: and }; const [total, records] = await Promise.all([this.db.product.count({ where }), this.db.product.findMany({ where, include: this.include, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize })]); return { items: await this.withApprovedRatings(records as ProductRecord[], locale), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }; }
  async findAdmin(input: ProductQuery = {}): Promise<ProductPage> { const locale = await requestLocale(); const page = input.page ?? 1; const pageSize = input.pageSize ?? 48; const where: Prisma.ProductWhereInput = { ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" } }, { sku: { contains: input.search, mode: "insensitive" } }] } : {}), ...(input.status ? { status: input.status } : {}), ...(input.categoryId ? { categoryId: input.categoryId } : {}) }; const [total, records] = await Promise.all([this.db.product.count({ where }), this.db.product.findMany({ where, include: this.include, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize })]); return { items: records.map((record) => toProduct(record as ProductRecord, locale)), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }; }
  async create(input: CreateProductInput & { slug: string; sku: string | null }) { const record = await this.db.$transaction(async (tx) => { const created = await tx.product.create({ data: { name: input.name, slug: input.slug, shortDescription: input.shortDescription ?? null, description: input.description ?? null, sku: input.sku, price: input.price, compareAtPrice: input.compareAtPrice ?? null, status: input.status ?? "DRAFT", isFeatured: input.isFeatured ?? false, categoryId: input.categoryId ?? null, trackInventory: input.trackInventory ?? false, stockQuantity: input.stockQuantity ?? 0, images: { create: imageData(input.images).map(({ mediaId, ...image }) => ({ ...image, url: null, media: { connect: { id: mediaId } } })) } }, include: this.include }); return created; }); return toProduct(record as ProductRecord); }
  async update(input: UpdateProductInput & { slug: string; sku: string | null }) { const record = await this.db.$transaction(async (tx) => { await tx.productImage.deleteMany({ where: { productId: input.id } }); return tx.product.update({ where: { id: input.id }, data: { name: input.name, slug: input.slug, shortDescription: input.shortDescription ?? null, description: input.description ?? null, sku: input.sku, price: input.price, compareAtPrice: input.compareAtPrice ?? null, status: input.status ?? "DRAFT", isFeatured: input.isFeatured ?? false, categoryId: input.categoryId ?? null, trackInventory: input.trackInventory ?? false, stockQuantity: input.stockQuantity ?? 0, images: { create: imageData(input.images).map(({ mediaId, ...image }) => ({ ...image, url: null, media: { connect: { id: mediaId } } })) } }, include: this.include }); }); return toProduct(record as ProductRecord); }
  async setStatus(id: ProductId, status: "ACTIVE" | "ARCHIVED") { return toProduct(await this.db.product.update({ where: { id }, data: { status }, include: this.include }) as ProductRecord); }
  async adjustStock(id: ProductId, quantityDelta: number, audit?: AuditMutationContext) {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id }, select: { name: true, stockQuantity: true } });
      if (!current) throw new Error("PRODUCT_NOT_FOUND");
      const result = await tx.product.updateMany({ where: { id, ...(quantityDelta < 0 ? { stockQuantity: { gte: Math.abs(quantityDelta) } } : {}) }, data: { stockQuantity: { increment: quantityDelta } } });
      if (result.count === 0) throw new Error("STOCK_NEGATIVE");
      const updated = await tx.product.findUniqueOrThrow({ where: { id }, include: this.include }) as ProductRecord;
      if (audit) {
        const logged = await this.audit.recordInTransaction(tx, { actor: audit.actor, requestId: audit.requestId, action: AUDIT_ACTIONS.PRODUCT_STOCK_CHANGED, entityType: AUDIT_ENTITY_TYPES.PRODUCT, entityId: id, entityLabel: current.name, changes: { fields: [{ field: "stockQuantity", before: current.stockQuantity, after: updated.stockQuantity }] }, metadata: { quantityDelta } });
        if (!logged.success) throw logged.error;
      }
      return updated;
    });
    return toProduct(record);
  }
  async hasOrderHistory(id: ProductId) { return (await this.db.orderItem.count({ where: { productId: id } })) > 0; }
  async delete(id: ProductId) { await this.db.product.delete({ where: { id } }); }
  async categoryExists(id: string) { return !!(await this.db.category.findUnique({ where: { id }, select: { id: true } })); }
  async findPurchasableByIds(ids: string[]) { if (ids.length === 0) return []; const records = await this.db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, include: this.include }); return records.map((record) => toProduct(record as ProductRecord)); }
}
