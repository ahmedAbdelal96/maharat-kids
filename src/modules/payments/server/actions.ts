"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { createPaymentMethodSchema, paymentMethodIdSchema, updatePaymentMethodSchema } from "../schema";
import { PaymentMethodService } from "../domain/service";
import { PrismaPaymentMethodRepository } from "../infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function service() { return new PaymentMethodService(new PrismaPaymentMethodRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }

export async function createPaymentMethod(input: unknown) { const parsed = createPaymentMethodSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the payment method details.", { issues: parsed.error.issues })); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().create(actor.data.user.id, parsed.data); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.PAYMENT_METHOD_CREATED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: result.data.id, entityLabel: result.data.name, metadata: { code: result.data.code, type: result.data.type, enabled: result.data.enabled } }); revalidatePath("/admin/settings"); } return result; }
export async function updatePaymentMethod(input: unknown) { const parsed = updatePaymentMethodSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the payment method details.", { issues: parsed.error.issues })); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().update(actor.data.user.id, parsed.data); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: result.data.id, entityLabel: result.data.name, changes: { fields: [{ field: "enabled", before: !result.data.enabled, after: result.data.enabled }] }, metadata: { code: result.data.code, type: result.data.type } }); revalidatePath("/admin/settings"); revalidatePath("/checkout"); } return result; }
export async function deletePaymentMethod(input: unknown) { const parsed = paymentMethodIdSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid payment method.")); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().delete(actor.data.user.id, parsed.data.id); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.PAYMENT_METHOD_DELETED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: parsed.data.id, entityLabel: "Deleted payment method" }); revalidatePath("/admin/settings"); } return result; }
