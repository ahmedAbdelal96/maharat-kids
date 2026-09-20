import "server-only";

import { PrismaClient, type PaymentStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { PaymentOperationOrder, PendingSettlement } from "../types-operations";

const orderSelect = {
  id: true,
  orderNumber: true,
  total: true,
  currency: true,
  paymentStatus: true,
  paymentMethodName: true,
  paymentReference: true,
  paymentNotes: true,
  paymentProviderCode: true,
  market: true,
  createdAt: true,
  customer: { select: { name: true, email: true } },
  bankTransfer: { select: { receiptKey: true, senderName: true, transferReference: true, transferredAmount: true, submittedAt: true } },
} as const;

function toOrder(record: { id: string; orderNumber: string; total: { toFixed: (digits: number) => string }; currency: string; paymentStatus: PaymentStatus; paymentMethodName: string; paymentReference: string | null; paymentNotes: string | null; paymentProviderCode: string | null; market: string | null; createdAt: Date; customer: { name: string | null; email: string | null }; bankTransfer?: { receiptKey: string | null; senderName: string; transferReference: string | null; transferredAmount: { toFixed: (digits: number) => string } | null; submittedAt: Date } | null }): PaymentOperationOrder {
  return { id: record.id, orderNumber: record.orderNumber, customerName: record.customer.name, customerEmail: record.customer.email, total: record.total.toFixed(2), currency: record.currency, paymentStatus: record.paymentStatus, paymentMethodName: record.paymentMethodName, paymentReference: record.paymentReference, paymentNotes: record.paymentNotes, paymentProviderCode: record.paymentProviderCode, market: record.market, receiptKey: record.bankTransfer?.receiptKey ?? null, senderName: record.bankTransfer?.senderName ?? null, transferReference: record.bankTransfer?.transferReference ?? null, transferredAmount: record.bankTransfer?.transferredAmount?.toFixed(2) ?? null, submittedAt: record.bankTransfer?.submittedAt.toISOString() ?? null, createdAt: record.createdAt.toISOString() };
}

export interface PaymentOperationsRepository {
  findVerificationQueue(): Promise<PaymentOperationOrder[]>;
  findPendingSettlements(): Promise<PendingSettlement[]>;
  settle(orderId: string, userId: string, note?: string): Promise<PendingSettlement>;
}

export class PrismaPaymentOperationsRepository implements PaymentOperationsRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findVerificationQueue() {
    const records = await this.db.order.findMany({ where: { paymentStatus: { in: ["PENDING_VERIFICATION", "PENDING"] }, paymentMethod: { is: { type: { in: ["MANUAL_TRANSFER", "BANK_TRANSFER"] } } } }, select: orderSelect, orderBy: { createdAt: "asc" } });
    return records.map(toOrder);
  }

  async findPendingSettlements() {
    const records = await this.db.paymentSettlement.findMany({ where: { status: "PENDING_SETTLEMENT", order: { paymentMethod: { is: { type: "CASH_ON_DELIVERY" } } } }, include: { order: { select: orderSelect } }, orderBy: { createdAt: "asc" } });
    return records.map((record) => ({ ...toOrder(record.order), settlementId: record.id, settlementAmount: record.amount.toFixed(2), settlementStatus: record.status, settledAt: record.settledAt?.toISOString() ?? null }));
  }

  async settle(orderId: string, userId: string, note?: string) {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.paymentSettlement.findUnique({ where: { orderId }, include: { order: { select: orderSelect } } });
      if (!current) throw new Error("SETTLEMENT_NOT_FOUND");
      if (current.status === "SETTLED") return current;
      return tx.paymentSettlement.update({ where: { id: current.id }, data: { status: "SETTLED", settledByUserId: userId, settledAt: new Date(), note: note?.trim() || current.note }, include: { order: { select: orderSelect } } });
    });
    return { ...toOrder(record.order), settlementId: record.id, settlementAmount: record.amount.toFixed(2), settlementStatus: record.status, settledAt: record.settledAt?.toISOString() ?? null };
  }
}
