import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPrismaClient } from "@/database/prisma";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getPrismaClient(); const submission = await db.bankTransferSubmission.findUnique({ where: { id }, include: { order: { select: { customerId: true } } } }); if (!submission?.receiptKey || !submission.receiptKey.startsWith("payment-proofs/")) return new NextResponse("Not found", { status: 404 });
  const customer = await requireCustomer(); let allowed = customer.success && customer.data.user.id === submission.order.customerId;
  if (!allowed) { const admin = await requireAuthenticatedUser(); if (admin.success) { const permission = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(admin.data.user.id, "payments.view"); allowed = permission.success; } }
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  try { const file = await readFile(path.join(process.cwd(), ".private", submission.receiptKey)); return new NextResponse(file, { headers: { "content-type": submission.receiptMimeType ?? "application/octet-stream", "cache-control": "private, no-store", "content-disposition": "inline" } }); } catch { return new NextResponse("Not found", { status: 404 }); }
}
