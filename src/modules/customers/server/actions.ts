'use server';

import "server-only";

import { revalidatePath } from "next/cache";

import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { AppError } from "@/core/errors";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { createPasswordHasher } from "@/modules/auth/providers/password-hasher";
import { checkRateLimit } from "@/server/rate-limit";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";
import { resolveMarket } from "@/modules/market/server/resolver";

import { CustomerService } from "../domain/service";
import { PrismaCustomerRepository } from "../infrastructure/repository";
import { addressIdSchema, addressSchema, changeCustomerPasswordSchema, customerProfileSchema, updateAddressSchema, updateCustomerStatusSchema } from "../schema";

function createDefaultCustomerService(): CustomerService {
  return new CustomerService(
    new PrismaCustomerRepository(),
    createPasswordHasher(),
    new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()),
  );
}

async function getCustomerActor() {
  const actor = await requireCustomer();
  return actor.success ? actor : failure(actor.error);
}

export async function updateCustomerProfile(input: unknown) {
  const parsed = customerProfileSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review your profile details.", { issues: parsed.error.issues }));
  const actor = await getCustomerActor();
  if (!actor.success) return failure(actor.error);
  const result = await createDefaultCustomerService().updateProfile(actor.data.user.id, parsed.data);
  if (result.success) revalidatePath("/account");
  return result;
}

export async function createCustomerAddress(input: unknown) {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review the address details.", { issues: parsed.error.issues }));
  const actor = await getCustomerActor();
  if (!actor.success) return failure(actor.error);
  const market = await resolveMarket();
  const result = await createDefaultCustomerService().createAddress(actor.data.user.id, market.market, parsed.data);
  if (result.success) revalidatePath("/account");
  return result;
}

export async function updateCustomerAddress(input: unknown) {
  const parsed = updateAddressSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review the address details.", { issues: parsed.error.issues }));
  const actor = await getCustomerActor();
  if (!actor.success) return failure(actor.error);
  const market = await resolveMarket();
  const { addressId, ...address } = parsed.data;
  const result = await createDefaultCustomerService().updateAddress(actor.data.user.id, addressId, market.market, address);
  if (result.success) revalidatePath("/account");
  return result;
}

export async function deleteCustomerAddress(input: unknown) {
  const parsed = addressIdSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid address."));
  const actor = await getCustomerActor();
  if (!actor.success) return failure(actor.error);
  const market = await resolveMarket();
  const result = await createDefaultCustomerService().deleteAddress(actor.data.user.id, parsed.data.addressId, market.market);
  if (result.success) revalidatePath("/account");
  return result;
}

export async function changeCustomerPassword(input: unknown) {
  const parsed = changeCustomerPasswordSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review your password details.", { issues: parsed.error.issues }));
  const actor = await getCustomerActor();
  if (!actor.success) return failure(actor.error);
  const limit = checkRateLimit(`auth:password-change:${actor.data.user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) return failure(new AppError("RATE_LIMITED", "Too many attempts. Please try again later."));
  return createDefaultCustomerService().changePassword(actor.data.user.id, actor.data.session.id, parsed.data);
}

export async function updateCustomerStatus(input: unknown) {
  const parsed = updateCustomerStatusSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid customer status.", { issues: parsed.error.issues }));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const before = await createDefaultCustomerService().getAdminCustomer(actor.data, parsed.data.customerId);
  if (!before.success) return failure(before.error);
  const result = await createDefaultCustomerService().updateAdminCustomerStatus(actor.data, parsed.data.customerId, parsed.data.status);
  if (result.success) {
    if (before.data.status !== result.data.status) {
      await writeAdminAudit(actor.data, { action: result.data.status === "SUSPENDED" ? AUDIT_ACTIONS.CUSTOMER_SUSPENDED : AUDIT_ACTIONS.CUSTOMER_ACTIVATED, entityType: AUDIT_ENTITY_TYPES.CUSTOMER, entityId: result.data.id, entityLabel: result.data.name ?? result.data.email ?? result.data.phone ?? result.data.id, changes: { fields: [{ field: "status", before: before.data.status, after: result.data.status }] } });
    }
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${parsed.data.customerId}`);
  }
  return result;
}

export async function getCustomerDetails(customerId: unknown) {
  const parsed = addressIdSchema.shape.addressId.safeParse(customerId);
  if (!parsed.success) return failure(new ValidationError("Please select a valid customer."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultCustomerService().getAdminCustomer(actor.data, parsed.data);
}
