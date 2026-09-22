"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPrismaClient } from "@/database/prisma";
import { failure, success } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { requireCustomer } from "@/modules/auth/server/queries";
import { privateObjectStorage } from "@/modules/storage/provider";

const inputSchema = z.object({ orderId: z.string().min(1), senderName: z.string().trim().min(2).max(160), transferReference: z.string().trim().max(120).optional(), transferredAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(), transferDate: z.string().trim().optional(), customerNote: z.string().trim().max(500).optional() });
const allowed = new Map([["application/pdf", ".pdf"], ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);

export async function submitBankTransferProof(input: unknown) {
  const parsed = inputSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please provide the transfer sender name and valid details."));
  const actor = await requireCustomer(); if (!actor.success) return failure(actor.error);
  const db = getPrismaClient();
  try {
    const record = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: parsed.data.orderId, customerId: actor.data.user.id }, select: { id: true, total: true, paymentSnapshot: true, paymentStatus: true } });
      if (!order || !order.paymentSnapshot || (order.paymentSnapshot as { method?: string }).method !== "BANK_TRANSFER") throw new Error("BANK_TRANSFER_NOT_AVAILABLE");
      if (["PAID", "REFUNDED"].includes(order.paymentStatus)) throw new Error("PAYMENT_ALREADY_FINAL");
      const submission = await tx.bankTransferSubmission.upsert({ where: { orderId: order.id }, update: { senderName: parsed.data.senderName, transferReference: parsed.data.transferReference ?? null, transferredAmount: parsed.data.transferredAmount ? parsed.data.transferredAmount : null, transferDate: parsed.data.transferDate ? new Date(parsed.data.transferDate) : null, customerNote: parsed.data.customerNote ?? null, status: "PENDING_VERIFICATION", submittedAt: new Date(), rejectionReason: null }, create: { orderId: order.id, senderName: parsed.data.senderName, transferReference: parsed.data.transferReference ?? null, transferredAmount: parsed.data.transferredAmount ? parsed.data.transferredAmount : null, transferDate: parsed.data.transferDate ? new Date(parsed.data.transferDate) : null, customerNote: parsed.data.customerNote ?? null } });
      if (order.paymentStatus !== "PENDING_VERIFICATION") { await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING_VERIFICATION" } }); await tx.paymentStatusHistory.create({ data: { orderId: order.id, oldStatus: order.paymentStatus, newStatus: "PENDING_VERIFICATION", changedByUserId: actor.data.user.id, note: "Bank transfer proof submitted for review." } }); }
      return submission;
    });
    return success({ id: record.id, status: record.status });
  } catch (error) { return failure(new ValidationError(error instanceof Error && error.message === "BANK_TRANSFER_NOT_AVAILABLE" ? "Bank transfer proof is not available for this order." : "Transfer proof could not be submitted.")); }
}

export async function uploadBankTransferProof(input: FormData) {
  const file = input.get("receipt"); const orderId = String(input.get("orderId") ?? "");
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024 || !allowed.has(file.type)) return failure(new ValidationError("Upload a PDF, JPEG, PNG, or WEBP receipt up to 10 MB."));
  const actor = await requireCustomer(); if (!actor.success) return failure(actor.error);
  const db = getPrismaClient(); const order = await db.order.findFirst({ where: { id: orderId, customerId: actor.data.user.id }, select: { id: true, paymentSnapshot: true } });
  if (!order || (order.paymentSnapshot as { method?: string } | null)?.method !== "BANK_TRANSFER") return failure(new ValidationError("Bank transfer proof is not available for this order."));
  const extension = allowed.get(file.type)!; const bytes = Buffer.from(await file.arrayBuffer()); const signatureValid = file.type === "application/pdf" ? bytes.subarray(0, 4).toString() === "%PDF" : file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 : file.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!signatureValid) return failure(new ValidationError("The receipt content does not match its declared file type."));
  const key = `payment-proofs/${randomUUID()}${extension}`;
  try {
    await privateObjectStorage.put({ key, bytes, mimeType: file.type });
    await db.bankTransferSubmission.upsert({ where: { orderId }, update: { receiptKey: key, receiptMimeType: file.type, receiptSize: file.size }, create: { orderId, senderName: "Receipt submitted", receiptKey: key, receiptMimeType: file.type, receiptSize: file.size } });
  } catch (error) {
    await privateObjectStorage.delete(key).catch(() => undefined);
    void error;
    return failure(new ValidationError("Receipt could not be stored securely."));
  }
  return success({ id: orderId });
}
