"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { PaymentOperationsService } from "../domain/operations-service";
import { PrismaPaymentOperationsRepository } from "../infrastructure/operations-repository";

const operationSchema = z.object({ orderId: z.string().trim().min(1), note: z.string().trim().max(500).optional() });
function service() { return new PaymentOperationsService(new PrismaPaymentOperationsRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
async function actor() { return requireAuthenticatedUser(); }
export async function verifyPayment(input: unknown, status: "PAID" | "FAILED") { const parsed = operationSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid payment operation.")); const current = await actor(); if (!current.success) return failure(current.error); const result = await service().verify(current.data.user.id, parsed.data.orderId, status, parsed.data.note); if (result.success) { revalidatePath("/admin/payments"); revalidatePath("/admin/orders"); revalidatePath("/admin"); } return result; }
export async function settlePayment(input: unknown) { const parsed = operationSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid settlement.")); const current = await actor(); if (!current.success) return failure(current.error); const result = await service().settle(current.data.user.id, parsed.data.orderId, parsed.data.note); if (result.success) { revalidatePath("/admin/payments"); revalidatePath("/admin"); } return result; }
