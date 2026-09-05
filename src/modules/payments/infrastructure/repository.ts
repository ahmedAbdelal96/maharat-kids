import "server-only";

import { PrismaClient, type PaymentMethod as PrismaPaymentMethod } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { PaymentMethod, PaymentMethodInput } from "../types";

function toMethod(record: PrismaPaymentMethod): PaymentMethod {
  return { id: record.id, code: record.code, name: record.name, type: record.type, enabled: record.enabled, isSystem: record.isSystem, destination: record.destination, instructions: record.instructions, confirmationWhatsApp: record.confirmationWhatsApp, providerKey: record.providerKey, sortOrder: record.sortOrder };
}

export interface PaymentMethodRepository {
  findEnabled(): Promise<PaymentMethod[]>;
  findAll(): Promise<PaymentMethod[]>;
  findById(id: string): Promise<PaymentMethod | null>;
  create(input: PaymentMethodInput): Promise<PaymentMethod>;
  update(id: string, input: PaymentMethodInput): Promise<PaymentMethod>;
  delete(id: string): Promise<void>;
}

export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}
  async findEnabled() { return (await this.db.paymentMethod.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).map(toMethod); }
  async findAll() { return (await this.db.paymentMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).map(toMethod); }
  async findById(id: string) { const record = await this.db.paymentMethod.findUnique({ where: { id } }); return record ? toMethod(record) : null; }
  async create(input: PaymentMethodInput) {
    const record = await this.db.paymentMethod.create({ data: { code: input.code ?? `manual_${crypto.randomUUID().replaceAll("-", "")}`, name: input.name, type: input.type, enabled: input.enabled, isSystem: false, destination: input.destination ?? null, instructions: input.instructions ?? null, confirmationWhatsApp: input.confirmationWhatsApp ?? null, providerKey: input.providerKey ?? null, sortOrder: input.sortOrder ?? 0 } });
    return toMethod(record);
  }
  async update(id: string, input: PaymentMethodInput) {
    const record = await this.db.paymentMethod.update({ where: { id }, data: { name: input.name, type: input.type, enabled: input.enabled, destination: input.destination ?? null, instructions: input.instructions ?? null, confirmationWhatsApp: input.confirmationWhatsApp ?? null, providerKey: input.providerKey ?? null, sortOrder: input.sortOrder ?? 0 } });
    return toMethod(record);
  }
  async delete(id: string) { await this.db.paymentMethod.delete({ where: { id } }); }
}
