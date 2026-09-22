import "server-only";

import { type PaymentMethodType } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import { privateDigitalStorage, validatePdf } from "../infrastructure/private-storage";

export type CartFulfillment = "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "MIXED";

export function classifyFulfillment(products: Array<{ fulfillmentType: "PHYSICAL" | "DIGITAL" }>): CartFulfillment {
  const hasDigital = products.some((product) => product.fulfillmentType === "DIGITAL");
  const hasPhysical = products.some((product) => product.fulfillmentType !== "DIGITAL");
  return hasDigital && hasPhysical ? "MIXED" : hasDigital ? "DIGITAL_ONLY" : "PHYSICAL_ONLY";
}

export function eligiblePaymentTypes(composition: CartFulfillment, methods: Array<{ type: PaymentMethodType; enabled: boolean; providerKey?: string | null }>) {
  return methods.filter((method) => method.enabled && (composition === "PHYSICAL_ONLY" || method.type !== "CASH_ON_DELIVERY") && (method.type !== "ONLINE_PAYMENT" || Boolean(method.providerKey))).map((method) => method.type);
}

export async function activeDigitalAssets(productId: string, variantId?: string | null, db = getPrismaClient()) {
  return db.digitalAsset.findMany({ where: { productId, status: "ACTIVE", OR: [{ variantId: null }, ...(variantId ? [{ variantId }] : [])] }, orderBy: [{ variantId: "asc" }, { version: "desc" }] });
}

export async function createDigitalAsset(input: { productId: string; variantId?: string | null; displayNameAr: string; displayNameEn: string; bytes: Uint8Array; mimeType?: string }, db = getPrismaClient()) {
  validatePdf(input.bytes, input.mimeType ?? "application/pdf");
  const product = await db.product.findUnique({ where: { id: input.productId }, select: { id: true, fulfillmentType: true } });
  if (!product || product.fulfillmentType !== "DIGITAL") throw new Error("DIGITAL_PRODUCT_REQUIRED");
  if (input.variantId) { const variant = await db.productVariant.findFirst({ where: { id: input.variantId, productId: input.productId }, select: { id: true } }); if (!variant) throw new Error("DIGITAL_VARIANT_INVALID"); }
  const stored = await privateDigitalStorage.putPdf(input.bytes, input.mimeType ?? "application/pdf");
  const latest = await db.digitalAsset.findFirst({ where: { productId: input.productId, variantId: input.variantId ?? null }, orderBy: { version: "desc" }, select: { version: true } });
  try {
    return await db.digitalAsset.create({ data: { productId: input.productId, variantId: input.variantId ?? null, displayNameAr: input.displayNameAr.trim(), displayNameEn: input.displayNameEn.trim(), storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, checksum: stored.checksum, version: (latest?.version ?? 0) + 1 } });
  } catch (error) { await privateDigitalStorage.remove(stored.storageKey); throw error; }
}

export async function fulfillPaidDigitalItems(orderId: string, db = getPrismaClient()) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.paymentStatus !== "PAID") return { granted: 0, skipped: true };
  let granted = 0;
  for (const item of order.items.filter((entry) => entry.fulfillmentTypeSnapshot === "DIGITAL")) {
    const assetIds = Array.isArray(item.digitalAssetIdsSnapshot) ? item.digitalAssetIdsSnapshot.filter((value): value is string => typeof value === "string") : [];
    for (const assetId of assetIds) {
      const asset = await db.digitalAsset.findUnique({ where: { id: assetId }, select: { id: true, storageKey: true, status: true, productId: true, variantId: true } });
      if (!asset || asset.status === "BLOCKED" || !(await privateDigitalStorage.exists(asset.storageKey))) continue;
      const existing = await db.digitalEntitlement.findUnique({ where: { orderItemId_digitalAssetId: { orderItemId: item.id, digitalAssetId: asset.id } }, select: { id: true } });
      if (existing) continue;
      await db.digitalEntitlement.create({ data: { userId: order.customerId, orderId: order.id, orderItemId: item.id, digitalAssetId: asset.id } });
      granted += 1;
    }
  }
  return { granted, skipped: false };
}

export async function revokeDigitalEntitlement(entitlementId: string, reason: string, db = getPrismaClient()) {
  return db.digitalEntitlement.update({ where: { id: entitlementId }, data: { status: "REVOKED", revokedAt: new Date(), reason } });
}
