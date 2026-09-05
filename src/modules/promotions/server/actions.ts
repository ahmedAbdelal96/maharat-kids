"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { createDefaultPromotionService } from "./queries";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";
import type { AuditValue } from "@/modules/audit/types";
import type { Promotion } from "../types";

function promotionAuditChanges(before: Promotion, after: Promotion) {
  const fields: Array<[string, AuditValue, AuditValue]> = [
    ["name", before.name, after.name],
    ["type", before.type, after.type],
    ["isActive", before.isActive, after.isActive],
    ["showInHero", before.showInHero, after.showInHero],
    ["showOnOffersPage", before.showOnOffersPage, after.showOnOffersPage],
    ["priority", before.priority, after.priority],
    ["minimumOrderSubtotal", before.minimumOrderSubtotal, after.minimumOrderSubtotal],
    ["percentageDiscount", before.percentageDiscount, after.percentageDiscount],
    ["fixedDiscountAmount", before.fixedDiscountAmount, after.fixedDiscountAmount],
    ["qualifyingProduct", before.qualifyingProduct?.name ?? null, after.qualifyingProduct?.name ?? null],
    ["buyQuantity", before.buyQuantity, after.buyQuantity],
    ["giftProduct", before.giftProduct?.name ?? null, after.giftProduct?.name ?? null],
    ["giftQuantity", before.giftQuantity, after.giftQuantity],
  ];

  return { fields: fields.filter(([, previous, next]) => JSON.stringify(previous) !== JSON.stringify(next)).map(([field, beforeValue, afterValue]) => ({ field, before: beforeValue, after: afterValue })) };
}

export async function createPromotion(input: unknown) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);

  const result = await createDefaultPromotionService().createPromotion(
    actor.data.user.id,
    input,
  );

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.PROMOTION_CREATED, entityType: AUDIT_ENTITY_TYPES.PROMOTION, entityId: result.data.id, entityLabel: result.data.name, metadata: { type: result.data.type, isActive: result.data.isActive } });
    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidatePath("/offers");
  }

  return result;
}

export async function updatePromotion(input: unknown) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);

  const promotionService = createDefaultPromotionService();
  const promotionId = typeof input === "object" && input !== null && "id" in input && typeof input.id === "string" ? input.id : null;
  const before = promotionId ? await promotionService.getAdminPromotion(actor.data.user.id, promotionId) : null;
  const result = await promotionService.updatePromotion(
    actor.data.user.id,
    input,
  );

  if (result.success) {
    const action = before?.success && before.data.isActive !== result.data.isActive
      ? result.data.isActive ? AUDIT_ACTIONS.PROMOTION_ACTIVATED : AUDIT_ACTIONS.PROMOTION_DEACTIVATED
      : AUDIT_ACTIONS.PROMOTION_UPDATED;
    await writeAdminAudit(actor.data, { action, entityType: AUDIT_ENTITY_TYPES.PROMOTION, entityId: result.data.id, entityLabel: result.data.name, changes: before?.success ? promotionAuditChanges(before.data, result.data) : null });
    revalidatePath("/admin/promotions");
    revalidatePath(`/admin/promotions/${result.data.id}`);
    revalidatePath("/");
    revalidatePath("/offers");
    revalidatePath(`/offers/${result.data.slug}`);
  }

  return result;
}

export async function deletePromotion(id: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);

  const result = await createDefaultPromotionService().deletePromotion(
    actor.data.user.id,
    id,
  );

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.PROMOTION_DELETED, entityType: AUDIT_ENTITY_TYPES.PROMOTION, entityId: id, entityLabel: "Deleted promotion" });
    revalidatePath("/admin/promotions");
    revalidatePath("/");
    revalidatePath("/offers");
  }

  return result;
}

export async function searchProductsForPromotion(search?: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);

  const { getPrismaClient } = await import("@/database/prisma");
  const db = getPrismaClient();
  const trimmed = search?.trim();

  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      ...(trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { sku: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      status: true,
      trackInventory: true,
      stockQuantity: true,
      images: {
        where: { isPrimary: true },
        select: { url: true },
        take: 1,
      },
    },
    take: 30,
    orderBy: { name: "asc" },
  });

  return {
    success: true as const,
    data: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price.toFixed(2),
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toFixed(2) : null,
      imageUrl: p.images[0]?.url ?? null,
      stockQuantity: p.stockQuantity,
      trackInventory: p.trackInventory,
      status: p.status,
    })),
  };
}

export async function getAdminPromotionLimitsUsageAction(excludeId?: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultPromotionService().getPromotionLimitsUsage(actor.data.user.id, excludeId);
}
