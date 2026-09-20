import "server-only";

import { PrismaClient, type Market, type PaymentMethod as PrismaPaymentMethod } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { PaymentMethod, PaymentMethodInput } from "../types";

type MethodRecord = PrismaPaymentMethod & { marketConfigs?: Array<{ id: string; market: Market; enabled: boolean; sortOrder: number }>; };
function toMethod(record: MethodRecord, market?: Market, bankAccount?: PaymentMethod["bankAccount"]): PaymentMethod {
  const config = market ? record.marketConfigs?.find((item) => item.market === market) : undefined;
  return { id: record.id, code: record.code, name: record.name, type: record.type, enabled: config ? config.enabled : record.enabled, isSystem: record.isSystem, destination: record.destination, instructions: record.instructions, confirmationWhatsApp: record.confirmationWhatsApp, providerKey: record.providerKey, sortOrder: config?.sortOrder ?? record.sortOrder, market, marketConfigId: config?.id, bankAccount };
}

export interface PaymentMethodRepository {
  findEnabled(): Promise<PaymentMethod[]>;
  findEnabledForMarket(market: Market): Promise<PaymentMethod[]>;
  findAll(): Promise<PaymentMethod[]>;
  findById(id: string): Promise<PaymentMethod | null>;
  create(input: PaymentMethodInput): Promise<PaymentMethod>;
  update(id: string, input: PaymentMethodInput): Promise<PaymentMethod>;
  delete(id: string): Promise<void>;
}

export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}
  async findEnabled() { return (await this.db.paymentMethod.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).map((record) => toMethod(record)); }
  async findEnabledForMarket(market: Market) {
    const records = await this.db.paymentMethod.findMany({ where: { enabled: true, marketConfigs: { some: { market, enabled: true } } }, include: { marketConfigs: { where: { market } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const bank = await this.db.bankTransferAccount.findFirst({ where: { market, enabled: true, isDefault: true }, orderBy: { createdAt: "asc" } });
    return records.map((record) => toMethod(record, market, record.type === "BANK_TRANSFER" || record.type === "MANUAL_TRANSFER" ? bank ? { id: bank.id, market: bank.market, bankNameAr: bank.bankNameAr, bankNameEn: bank.bankNameEn, accountHolderName: bank.accountHolderName, iban: bank.iban, accountNumber: bank.accountNumber, swiftCode: bank.swiftCode, instructionsAr: bank.instructionsAr, instructionsEn: bank.instructionsEn } : null : undefined));
  }
  async findAll() { return (await this.db.paymentMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })).map((record) => toMethod(record)); }
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
