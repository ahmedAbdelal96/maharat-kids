import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { LOW_STOCK_THRESHOLD } from "../constants";
import { AuditLogService } from "@/modules/audit/domain/service";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { PrismaAuditLogRepository } from "@/modules/audit/infrastructure/repository";
import type { AuditMutationContext } from "@/modules/audit/types";
import type { InventoryItem, InventoryItemId, AdjustInventoryInput, InventoryPage, InventoryProduct, InventoryQuery } from "../types";

export interface InventoryItemRepository {
  findById(id: InventoryItemId): Promise<InventoryItem | null>;
  create(input: AdjustInventoryInput): Promise<InventoryItem>;
}

export interface InventoryRepository {
  findPage(input: InventoryQuery): Promise<InventoryPage>;
  updateQuantity(productId: string, stockQuantity: number, audit?: AuditMutationContext): Promise<InventoryProduct>;
}

function imageUrl(product: { images: Array<{ url: string | null; media: { url: string } | null }> }) {
  return product.images[0]?.media?.url ?? product.images[0]?.url ?? null;
}

function toProduct(record: {
  id: string; name: string; sku: string | null; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  trackInventory: boolean; stockQuantity: number; category: { name: string } | null;
  images: Array<{ url: string | null; media: { url: string } | null }>;
}): InventoryProduct {
  return { id: record.id, name: record.name, sku: record.sku, status: record.status, trackInventory: record.trackInventory, stockQuantity: record.stockQuantity, categoryName: record.category?.name ?? null, imageUrl: imageUrl(record) };
}

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}
  private audit = new AuditLogService(new PrismaAuditLogRepository());

  private readonly include = {
    category: { select: { name: true } },
    images: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { url: true, media: { select: { url: true } } } },
  };

  private baseWhere(input: InventoryQuery): Prisma.ProductWhereInput {
    return {
      ...(input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" } }, { sku: { contains: input.search, mode: "insensitive" } }] } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
  }

  private stateWhere(filter: InventoryQuery["filter"]): Prisma.ProductWhereInput {
    switch (filter) {
      case "TRACKED": return { trackInventory: true };
      case "UNTRACKED": return { trackInventory: false };
      case "IN_STOCK": return { trackInventory: true, stockQuantity: { gt: LOW_STOCK_THRESHOLD } };
      case "LOW_STOCK": return { trackInventory: true, stockQuantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } };
      case "OUT_OF_STOCK": return { trackInventory: true, stockQuantity: 0 };
      default: return {};
    }
  }

  async findPage(input: InventoryQuery): Promise<InventoryPage> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const base = this.baseWhere(input);
    const where: Prisma.ProductWhereInput = { AND: [base, this.stateWhere(input.filter)] };
    const [total, records, tracked, untracked, inStock, lowStock, outOfStock] = await Promise.all([
      this.db.product.count({ where }),
      this.db.product.findMany({ where, include: this.include, orderBy: [{ status: "asc" }, { stockQuantity: "asc" }, { updatedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      this.db.product.count({ where: { AND: [base, { trackInventory: true }] } }),
      this.db.product.count({ where: { AND: [base, { trackInventory: false }] } }),
      this.db.product.count({ where: { AND: [base, this.stateWhere("IN_STOCK")] } }),
      this.db.product.count({ where: { AND: [base, this.stateWhere("LOW_STOCK")] } }),
      this.db.product.count({ where: { AND: [base, this.stateWhere("OUT_OF_STOCK")] } }),
    ]);
    return { items: records.map((record) => toProduct(record as Parameters<typeof toProduct>[0])), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), counts: { all: await this.db.product.count({ where: base }), tracked, untracked, inStock, lowStock, outOfStock } };
  }

  async updateQuantity(productId: string, stockQuantity: number, audit?: AuditMutationContext): Promise<InventoryProduct> {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id: productId }, select: { name: true, trackInventory: true, stockQuantity: true } });
      if (!current) throw new Error("PRODUCT_NOT_FOUND");
      if (!current.trackInventory) throw new Error("INVENTORY_UNTRACKED");
      await tx.product.update({ where: { id: productId }, data: { stockQuantity } });
      const updated = await tx.product.findUniqueOrThrow({ where: { id: productId }, include: this.include });
      if (audit && current.stockQuantity !== stockQuantity) {
        const logged = await this.audit.recordInTransaction(tx, { actor: audit.actor, requestId: audit.requestId, action: AUDIT_ACTIONS.PRODUCT_STOCK_CHANGED, entityType: AUDIT_ENTITY_TYPES.PRODUCT, entityId: productId, entityLabel: current.name, changes: { fields: [{ field: "stockQuantity", before: current.stockQuantity, after: stockQuantity }] } });
        if (!logged.success) throw logged.error;
      }
      return updated;
    });
    return toProduct(record as Parameters<typeof toProduct>[0]);
  }
}
