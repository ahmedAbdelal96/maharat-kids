"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { CouponService } from "../domain/service";
import { PrismaCouponRepository } from "../infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function service() { return new CouponService(new PrismaCouponRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
function refresh(id?: string) { revalidatePath("/admin/coupons"); if (id) revalidatePath(`/admin/coupons/${id}`); revalidatePath("/cart"); revalidatePath("/checkout"); }

export async function createCoupon(input: unknown) { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().create(actor.data.user.id, input); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.COUPON_CREATED, entityType: AUDIT_ENTITY_TYPES.COUPON, entityId: result.data.id, entityLabel: result.data.code, metadata: { type: result.data.type, enabled: result.data.isActive } }); refresh(result.data.id); } return result; }
export async function updateCoupon(input: unknown) { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().update(actor.data.user.id, input); if (result.success) { await writeAdminAudit(actor.data, { action: result.data.isActive ? AUDIT_ACTIONS.COUPON_ACTIVATED : AUDIT_ACTIONS.COUPON_DEACTIVATED, entityType: AUDIT_ENTITY_TYPES.COUPON, entityId: result.data.id, entityLabel: result.data.code, metadata: { operation: "coupon_updated", redeemedCount: result.data.redeemedCount } }); refresh(result.data.id); } return result; }
export async function deleteCoupon(id: string) { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().delete(actor.data.user.id, id); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.COUPON_DELETED, entityType: AUDIT_ENTITY_TYPES.COUPON, entityId: id, entityLabel: result.data.code }); refresh(); } return result; }
