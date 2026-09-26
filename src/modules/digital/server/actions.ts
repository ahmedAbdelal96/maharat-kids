"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { failure, success } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { getPrismaClient } from "@/database/prisma";
import { createDigitalAsset, revokeDigitalEntitlement } from "../domain/service";

export async function uploadDigitalAsset(input: FormData) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(actor.data.user.id as never, "products.update");
  if (!allowed.success) return failure(allowed.error);
  const productId = String(input.get("productId") ?? "").trim();
  const variantIdValue = String(input.get("variantId") ?? "").trim();
  const displayNameAr = String(input.get("displayNameAr") ?? "").trim();
  const displayNameEn = String(input.get("displayNameEn") ?? "").trim();
  const file = input.get("file");
  if (!productId || !displayNameAr || !displayNameEn || !(file instanceof File)) return failure(new ValidationError("Please provide a product, both display names, and a PDF file."));
  try {
    const asset = await createDigitalAsset({ productId, variantId: variantIdValue || null, displayNameAr, displayNameEn, bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type || "application/pdf" });
    revalidatePath("/admin/products");
    revalidatePath("/products", "layout");
    return success({ id: asset.id, version: asset.version });
  } catch (error) {
    return failure(new ValidationError(error instanceof Error && ["STORAGE_UNAVAILABLE", "DURABLE_STORAGE_REQUIRED_IN_PRODUCTION"].includes(error.message) ? "Digital file storage is temporarily unavailable." : "Digital asset could not be uploaded."));
  }
}

export async function setDigitalAssetStatus(assetId: string, status: "ACTIVE" | "RETIRED" | "BLOCKED") {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(actor.data.user.id as never, "products.update");
  if (!allowed.success) return failure(allowed.error);
  const asset = await getPrismaClient().digitalAsset.update({ where: { id: assetId }, data: { status } });
  revalidatePath("/admin/products");
  revalidatePath("/account/digital-library");
  return success({ id: asset.id, status: asset.status });
}

export async function retryPaidDigitalFulfillment(orderId: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(actor.data.user.id as never, "payments.verify");
  if (!allowed.success) return failure(allowed.error);
  const { fulfillPaidDigitalItems } = await import("../domain/service");
  return success(await fulfillPaidDigitalItems(orderId));
}

export async function revokeDigitalEntitlementAction(entitlementId: string, reason: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(actor.data.user.id as never, "payments.verify");
  if (!allowed.success) return failure(allowed.error);
  return success(await revokeDigitalEntitlement(entitlementId, reason));
}
