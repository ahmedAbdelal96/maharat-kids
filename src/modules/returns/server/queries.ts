import "server-only";

import { AppError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { adminReturnQuerySchema } from "../schema";
import { createReturnService } from "./service";

export async function getCustomerReturns() {
  const current = await requireCustomer();
  if (!current.success) return failure(current.error);
  return createReturnService().getCustomerReturns(current.data.user.id);
}

export async function getCustomerReturnDetails(id: string) {
  const current = await requireCustomer();
  if (!current.success) return failure(current.error);
  return createReturnService().getCustomerReturn(current.data.user.id, id);
}

export async function getReturnEligibleOrder(orderNumber: string) {
  const current = await requireCustomer();
  if (!current.success) return failure(current.error);
  return createReturnService().getEligibleOrder(current.data.user.id, orderNumber);
}

export async function getAdminReturnsPage(input: unknown = {}) {
  const parsed = adminReturnQuerySchema.safeParse(input);
  if (!parsed.success) return failure(new AppError("INVALID_RETURN_QUERY", "Invalid return query."));
  const current = await requireAuthenticatedUser();
  if (!current.success) return failure(current.error);
  return createReturnService().getAdminPage(current.data.user.id, parsed.data);
}

export async function getAdminReturnDetails(id: string) {
  const current = await requireAuthenticatedUser();
  if (!current.success) return failure(current.error);
  return createReturnService().getAdminDetails(current.data.user.id, id);
}
