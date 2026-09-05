import "server-only";

import { randomBytes } from "node:crypto";
import { PrismaClient, type User as PrismaUser } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import type { User, UserId, UserStatus, UserType } from "@/modules/identity/types";

export type OAuthUserRecord = { user: User };

export interface OAuthRepository {
  findByProviderAccount(provider: string, providerAccountId: string): Promise<OAuthUserRecord | null>;
  findUserByEmail(email: string): Promise<User | null>;
  linkAccount(input: { userId: UserId; provider: string; providerAccountId: string }): Promise<void>;
  createCustomer(input: { email: string; provider: string; providerAccountId: string }): Promise<User>;
}

function toUser(record: PrismaUser): User {
  return {
    ...record,
    id: record.id as UserId,
    type: record.type as UserType,
    status: record.status as UserStatus,
  };
}

export class PrismaOAuthRepository implements OAuthRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByProviderAccount(provider: string, providerAccountId: string): Promise<OAuthUserRecord | null> {
    const account = await this.db.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });

    return account ? { user: toUser(account.user) } : null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    return user ? toUser(user) : null;
  }

  async linkAccount(input: { userId: UserId; provider: string; providerAccountId: string }): Promise<void> {
    await this.db.oAuthAccount.create({ data: input });
  }

  async createCustomer(input: { email: string; provider: string; providerAccountId: string }): Promise<User> {
    const externalOnlyPassword = `external-only$${randomBytes(32).toString("hex")}`;
    const user = await this.db.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email: input.email,
          passwordHash: externalOnlyPassword,
          type: "CUSTOMER",
          status: "ACTIVE",
          marketingConsent: false,
        },
      });

      await transaction.oAuthAccount.create({
        data: {
          userId: created.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      });

      return created;
    });

    return toUser(user);
  }
}
