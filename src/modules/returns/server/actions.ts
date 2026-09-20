"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { approveReturnSchema, completeRefundSchema, receiveReturnSchema, rejectReturnSchema, requestReturnSchema, returnIdSchema } from "../schema";
import { createReturnService } from "./service";

function refresh() { revalidatePath("/account/orders"); revalidatePath("/account/returns"); revalidatePath("/admin/returns"); revalidatePath("/admin"); revalidatePath("/admin/orders"); }

export async function requestReturn(input: unknown) { const parsed = requestReturnSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the return details.")); const current = await requireCustomer(); if (!current.success) return failure(current.error); const result = await createReturnService().request(current.data.user.id, parsed.data); if (result.success) refresh(); return result; }
export async function cancelReturn(input: unknown) { const parsed = returnIdSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid return request.")); const current = await requireCustomer(); if (!current.success) return failure(current.error); const result = await createReturnService().cancel(current.data.user.id, parsed.data.id); if (result.success) refresh(); return result; }
function auditContext(user: { id: string; name: string | null; email: string | null }) { return { actor: { userId: user.id, name: user.name, email: user.email } }; }
export async function approveReturn(input: unknown) { const parsed = approveReturnSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the approved quantities.")); const current = await requireAuthenticatedUser(); if (!current.success) return failure(current.error); const result = await createReturnService().approve(current.data.user.id, parsed.data, auditContext(current.data.user)); if (result.success) refresh(); return result; }
export async function rejectReturn(input: unknown) { const parsed = rejectReturnSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("A customer-safe rejection reason is required.")); const current = await requireAuthenticatedUser(); if (!current.success) return failure(current.error); const result = await createReturnService().reject(current.data.user.id, parsed.data.id, parsed.data.customerVisibleNote, auditContext(current.data.user)); if (result.success) refresh(); return result; }
export async function startReturn(input: unknown) { const parsed = returnIdSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid return request.")); const current = await requireAuthenticatedUser(); if (!current.success) return failure(current.error); const result = await createReturnService().startReturning(current.data.user.id, parsed.data.id, auditContext(current.data.user)); if (result.success) refresh(); return result; }
export async function receiveReturn(input: unknown) { const parsed = receiveReturnSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review received and restock quantities.")); const current = await requireAuthenticatedUser(); if (!current.success) return failure(current.error); const result = await createReturnService().receive(current.data.user.id, parsed.data, auditContext(current.data.user)); if (result.success) refresh(); return result; }
export async function completeRefund(input: unknown) { const parsed = completeRefundSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the refund details.")); const current = await requireAuthenticatedUser(); if (!current.success) return failure(current.error); const result = await createReturnService().completeRefund(current.data.user.id, parsed.data.id, parsed.data.method, parsed.data.reference, parsed.data.note, auditContext(current.data.user)); if (result.success) refresh(); return result; }
