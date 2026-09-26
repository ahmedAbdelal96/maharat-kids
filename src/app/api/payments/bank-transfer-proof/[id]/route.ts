import "server-only";

import { NextResponse } from "next/server";
import { getPrismaClient } from "@/database/prisma";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { isStorageAvailable, privateObjectStorage } from "@/modules/storage/provider";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getPrismaClient(); const submission = await db.bankTransferSubmission.findUnique({ where: { id }, include: { order: { select: { customerId: true } } } }); if (!submission?.receiptKey || !submission.receiptKey.startsWith("payment-proofs/")) return new NextResponse("Not found", { status: 404 });
  const customer = await requireCustomer(); let allowed = customer.success && customer.data.user.id === submission.order.customerId;
  if (!allowed) { const admin = await requireAuthenticatedUser(); if (admin.success) { const permission = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(admin.data.user.id, "payments.view"); allowed = permission.success; } }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  if (!isStorageAvailable()) return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
  try { const file = await privateObjectStorage.get(submission.receiptKey); return new NextResponse(Buffer.from(file), { headers: { "content-type": submission.receiptMimeType ?? "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline" } }); } catch { return new NextResponse("Not found", { status: 404 }); }
}
