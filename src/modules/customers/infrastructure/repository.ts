import "server-only";

import { PrismaClient, type Prisma } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import type { UserId, UserStatus } from "@/modules/identity/types";

import type {
  AddressInput,
  AdminCustomer,
  AdminCustomerDetails,
  CustomerAddress,
  CustomerProfile,
  CustomerProfileInput,
} from "../types";

const profileArgs = {
  include: { _count: { select: { addresses: true } } },
} satisfies Prisma.UserDefaultArgs;

const addressOrderBy = [{ isDefault: "desc" as const }, { createdAt: "asc" as const }];

type PrismaProfile = Prisma.UserGetPayload<typeof profileArgs>;
type PrismaAddress = Prisma.CustomerAddressGetPayload<Prisma.CustomerAddressDefaultArgs>;

function toProfile(record: PrismaProfile): CustomerProfile {
  return {
    id: record.id as UserId,
    name: record.name,
    email: record.email,
    phone: record.phone,
    status: record.status,
    firstLoginAt: record.firstLoginAt,
    lastLoginAt: record.lastLoginAt,
    loginCount: record.loginCount,
    marketingConsent: record.marketingConsent,
    marketingConsentAt: record.marketingConsentAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    addressCount: record._count.addresses,
  };
}

function toAddress(record: PrismaAddress): CustomerAddress {
  return { ...record, userId: record.userId as UserId };
}

export interface CustomerRepository {
  findCustomerProfile(userId: UserId): Promise<CustomerProfile | null>;
  findCustomerWithPassword(userId: UserId): Promise<{ passwordHash: string } | null>;
  findUserByEmail(email: string, excludingUserId: UserId): Promise<{ id: string } | null>;
  updateProfile(userId: UserId, input: CustomerProfileInput): Promise<CustomerProfile>;
  findAddresses(userId: UserId): Promise<CustomerAddress[]>;
  createAddress(userId: UserId, input: AddressInput): Promise<CustomerAddress>;
  updateAddress(userId: UserId, addressId: string, input: AddressInput): Promise<CustomerAddress>;
  deleteAddress(userId: UserId, addressId: string): Promise<boolean>;
  updatePasswordAndDeleteOtherSessions(userId: UserId, passwordHash: string, currentSessionId: string): Promise<void>;
  findAdminCustomers(): Promise<CustomerProfile[]>;
  findAdminCustomerById(customerId: UserId): Promise<AdminCustomerDetails | null>;
  updateCustomerStatus(customerId: UserId, status: UserStatus): Promise<AdminCustomer>;
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findCustomerProfile(userId: UserId): Promise<CustomerProfile | null> {
    const record = await this.db.user.findFirst({ where: { id: userId, type: "CUSTOMER" }, ...profileArgs });
    return record ? toProfile(record) : null;
  }

  async findCustomerWithPassword(userId: UserId): Promise<{ passwordHash: string } | null> {
    return this.db.user.findFirst({ where: { id: userId, type: "CUSTOMER" }, select: { passwordHash: true } });
  }

  async findUserByEmail(email: string, excludingUserId: UserId): Promise<{ id: string } | null> {
    return this.db.user.findFirst({ where: { email, id: { not: excludingUserId } }, select: { id: true } });
  }

  async updateProfile(userId: UserId, input: CustomerProfileInput): Promise<CustomerProfile> {
    const current = await this.db.user.findUnique({ where: { id: userId }, select: { marketingConsent: true, marketingConsentAt: true } });
    const record = await this.db.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        ...(input.marketingConsent === undefined ? {} : {
          marketingConsent: input.marketingConsent,
          marketingConsentAt: input.marketingConsent
            ? current?.marketingConsentAt ?? new Date()
            : null,
        }),
      },
      ...profileArgs,
    });
    return toProfile(record);
  }

  async findAddresses(userId: UserId): Promise<CustomerAddress[]> {
    const records = await this.db.customerAddress.findMany({ where: { userId }, orderBy: addressOrderBy });
    return records.map(toAddress);
  }

  async createAddress(userId: UserId, input: AddressInput): Promise<CustomerAddress> {
    return this.db.$transaction(async (transaction) => {
      const addressCount = await transaction.customerAddress.count({ where: { userId } });
      const isDefault = addressCount === 0 || input.isDefault === true;

      if (isDefault) {
        await transaction.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      const record = await transaction.customerAddress.create({ data: { ...input, isDefault, userId } });
      return toAddress(record);
    });
  }

  async updateAddress(userId: UserId, addressId: string, input: AddressInput): Promise<CustomerAddress> {
    return this.db.$transaction(async (transaction) => {
      const existing = await transaction.customerAddress.findFirst({ where: { id: addressId, userId } });

      if (!existing) throw new Error("ADDRESS_NOT_FOUND");

      if (input.isDefault === true) {
        await transaction.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      const record = await transaction.customerAddress.update({
        where: { id: addressId },
        data: { ...input, isDefault: input.isDefault ?? existing.isDefault },
      });
      return toAddress(record);
    });
  }

  async deleteAddress(userId: UserId, addressId: string): Promise<boolean> {
    return this.db.$transaction(async (transaction) => {
      const existing = await transaction.customerAddress.findFirst({ where: { id: addressId, userId } });
      if (!existing) return false;

      await transaction.customerAddress.delete({ where: { id: addressId } });

      if (existing.isDefault) {
        const next = await transaction.customerAddress.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
        if (next) await transaction.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }

      return true;
    });
  }

  async updatePasswordAndDeleteOtherSessions(userId: UserId, passwordHash: string, currentSessionId: string): Promise<void> {
    await this.db.$transaction([
      this.db.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.db.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
    ]);
  }

  async findAdminCustomers(): Promise<AdminCustomer[]> {
    const records = await this.db.user.findMany({ where: { type: "CUSTOMER" }, ...profileArgs, orderBy: { createdAt: "desc" } });
    return records.map(toProfile);
  }

  async findAdminCustomerById(customerId: UserId): Promise<AdminCustomerDetails | null> {
    const record = await this.db.user.findFirst({ where: { id: customerId, type: "CUSTOMER" }, ...profileArgs });
    if (!record) return null;
    return { ...toProfile(record), addresses: await this.findAddresses(customerId) };
  }

  async updateCustomerStatus(customerId: UserId, status: UserStatus): Promise<AdminCustomer> {
    const record = await this.db.user.update({ where: { id: customerId }, data: { status }, ...profileArgs });
    return toProfile(record);
  }
}
