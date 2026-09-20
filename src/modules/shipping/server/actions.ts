"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { assignShipmentSchema, bulkReturnSchema, settlementBatchSchema, shippingCompanySchema, transitionShipmentSchema, updateShippingCompanyInputSchema, updateShippingCarrierConfigurationSchema } from "../schema";
import { ShippingService } from "../domain/service";
import { PrismaShippingRepository } from "../infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function service() { return new ShippingService(new PrismaShippingRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
async function actor() { return requireAuthenticatedUser(); }
function refresh() { revalidatePath("/admin/shipping"); revalidatePath("/admin"); revalidatePath("/admin/orders"); }

export async function createShippingCompany(input: unknown) {
  const parsed = shippingCompanySchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter a valid shipping company."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().createCompany(current.data.user.id, parsed.data);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPPING_COMPANY_CREATED, entityType: AUDIT_ENTITY_TYPES.SHIPPING_COMPANY, entityId: result.data.id, entityLabel: result.data.name }); refresh(); }
  return result;
}

export async function updateShippingCompany(input: unknown) {
  const parsed = updateShippingCompanyInputSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter valid shipping company details."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const { id, ...data } = parsed.data;
  const result = await service().updateCompany(current.data.user.id, id, data);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPPING_COMPANY_UPDATED, entityType: AUDIT_ENTITY_TYPES.SHIPPING_COMPANY, entityId: result.data.id, entityLabel: result.data.name, changes: { fields: [{ field: "active", before: !result.data.isActive, after: result.data.isActive }] } }); refresh(); }
  return result;
}

export async function updateShippingCarrierConfiguration(input: unknown) {
  const parsed = updateShippingCarrierConfigurationSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter valid carrier and market shipping settings."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().updateCarrierConfiguration(current.data.user.id, parsed.data);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPPING_COMPANY_UPDATED, entityType: AUDIT_ENTITY_TYPES.SHIPPING_COMPANY, entityId: result.data.id, entityLabel: result.data.name, metadata: { markets: result.data.markets } }); refresh(); }
  return result;
}

export async function deleteShippingCompany(id: string) {
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().deleteCompany(current.data.user.id, id);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPPING_COMPANY_UPDATED, entityType: AUDIT_ENTITY_TYPES.SHIPPING_COMPANY, entityId: id, entityLabel: "Shipping company" }); refresh(); }
  return result;
}

export async function assignShippingCompany(input: unknown) {
  const parsed = assignShipmentSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please choose a valid shipping company."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().assignShipment(current.data.user.id, parsed.data.orderId, parsed.data.shippingCompanyId, parsed.data.trackingNumber);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPMENT_ASSIGNED, entityType: AUDIT_ENTITY_TYPES.SHIPMENT, entityId: parsed.data.orderId, entityLabel: parsed.data.orderId, metadata: { shippingCompanyId: parsed.data.shippingCompanyId, trackingNumber: parsed.data.trackingNumber ?? null } }); refresh(); }
  return result;
}

export async function updateShipmentStatus(input: unknown) {
  const parsed = transitionShipmentSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter a valid shipment update."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().transitionShipment(current.data.user.id, parsed.data);
  if (result.success) { const history = result.data.history.at(-1); await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SHIPMENT_STATUS_CHANGED, entityType: AUDIT_ENTITY_TYPES.SHIPMENT, entityId: result.data.id, entityLabel: result.data.orderNumber, changes: history ? { fields: [{ field: "status", before: history.oldStatus ?? "None", after: history.newStatus }] } : null }); refresh(); }
  return result;
}

export async function receiveCarrierSettlement(input: unknown) {
  const parsed = settlementBatchSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter valid settlement details."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().receiveSettlement(current.data.user.id, parsed.data);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.SETTLEMENT_COMPLETED, entityType: AUDIT_ENTITY_TYPES.SETTLEMENT, entityId: result.data.id, entityLabel: result.data.reference ?? result.data.id, metadata: { expectedAmount: result.data.expectedAmount, receivedAmount: result.data.receivedAmount, orderCount: result.data.orderCount } }); refresh(); }
  return result;
}

export async function receiveReturns(input: unknown) {
  const parsed = bulkReturnSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select valid returns."));
  const current = await actor();
  if (!current.success) return failure(current.error);
  const result = await service().receiveReturns(current.data.user.id, parsed.data.shippingCompanyId, parsed.data.orderIds);
  if (result.success) { await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.RETURN_RECEIVED, entityType: AUDIT_ENTITY_TYPES.SHIPMENT, entityId: parsed.data.shippingCompanyId, entityLabel: "Carrier returns", metadata: { orderCount: parsed.data.orderIds.length } }); refresh(); }
  return result;
}
