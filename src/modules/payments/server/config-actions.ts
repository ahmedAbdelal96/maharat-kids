"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrismaClient } from "@/database/prisma";
import { failure, success } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

const marketSchema = z.enum(["SAUDI_ARABIA", "EGYPT"]);
const configSchema = z.object({ paymentMethodId: z.string().min(1), market: marketSchema, enabled: z.boolean(), sortOrder: z.number().int().min(0).max(999).default(0) });
const bankSchema = z.object({ id: z.string().optional(), market: marketSchema, bankNameAr: z.string().trim().min(1).max(120), bankNameEn: z.string().trim().min(1).max(120), accountHolderName: z.string().trim().min(1).max(160), iban: z.string().trim().min(8).max(64), accountNumber: z.string().trim().max(64).nullable().optional(), swiftCode: z.string().trim().max(32).nullable().optional(), instructionsAr: z.string().trim().max(1000).nullable().optional(), instructionsEn: z.string().trim().max(1000).nullable().optional(), enabled: z.boolean(), isDefault: z.boolean() });

async function actor() { const current = await requireAuthenticatedUser(); if (!current.success) return current; const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(current.data.user.id, "payments.settings"); return allowed.success ? current : allowed; }

export async function updatePaymentMethodMarketConfig(input: unknown) {
  const parsed = configSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the payment method configuration."));
  const current = await actor(); if (!current.success) return failure(current.error);
  const db = getPrismaClient();
  try {
    const method = await db.paymentMethod.findUnique({ where: { id: parsed.data.paymentMethodId } });
    if (!method) return failure(new ValidationError("Payment method does not exist."));
    const record = await db.paymentMethodMarketConfig.upsert({ where: { market_paymentMethodId: { market: parsed.data.market, paymentMethodId: parsed.data.paymentMethodId } }, update: { enabled: parsed.data.enabled, sortOrder: parsed.data.sortOrder }, create: { market: parsed.data.market, paymentMethodId: parsed.data.paymentMethodId, enabled: parsed.data.enabled, sortOrder: parsed.data.sortOrder } });
    await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: record.id, entityLabel: `${method.name} · ${parsed.data.market}`, metadata: { market: parsed.data.market, enabled: parsed.data.enabled } });
    revalidatePath("/admin/settings"); revalidatePath("/checkout");
    return success(record);
  } catch (error) { return failure(new ValidationError(error instanceof Error ? error.message : "Payment configuration could not be updated.")); }
}

export async function upsertBankTransferAccount(input: unknown) {
  const parsed = bankSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the bank account details."));
  const current = await actor(); if (!current.success) return failure(current.error);
  const db = getPrismaClient();
  try {
    const record = await db.$transaction(async (tx) => {
      if (parsed.data.isDefault) await tx.bankTransferAccount.updateMany({ where: { market: parsed.data.market, id: parsed.data.id ? { not: parsed.data.id } : undefined }, data: { isDefault: false } });
      return parsed.data.id ? tx.bankTransferAccount.update({ where: { id: parsed.data.id }, data: { ...parsed.data, id: undefined, accountNumber: parsed.data.accountNumber ?? null, swiftCode: parsed.data.swiftCode ?? null, instructionsAr: parsed.data.instructionsAr ?? null, instructionsEn: parsed.data.instructionsEn ?? null } }) : tx.bankTransferAccount.create({ data: { ...parsed.data, accountNumber: parsed.data.accountNumber ?? null, swiftCode: parsed.data.swiftCode ?? null, instructionsAr: parsed.data.instructionsAr ?? null, instructionsEn: parsed.data.instructionsEn ?? null } });
    });
    await writeAdminAudit(current.data, { action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATED, entityType: AUDIT_ENTITY_TYPES.PAYMENT, entityId: record.id, entityLabel: `Bank transfer · ${record.market}`, metadata: { market: record.market, enabled: record.enabled, isDefault: record.isDefault } });
    revalidatePath("/admin/settings"); revalidatePath("/checkout"); return success(record);
  } catch (error) { return failure(new ValidationError(error instanceof Error ? error.message : "Bank account could not be saved.")); }
}
