import "server-only";

import {
  PrismaClient,
  type Prisma,
  type Session as PrismaSession,
  type User as PrismaUser,
} from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import type {
  PermissionKey,
  Role,
  RoleId,
  Session,
  User,
  UserId,
} from "@/modules/identity/types";
import type { UserStatus, UserType } from "@/modules/identity/types";

const userWithAccessArgs = {
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

type PrismaUserWithAccess = Prisma.UserGetPayload<typeof userWithAccessArgs>;

export type UserWithAccess = {
  user: User;
  roles: Role[];
  permissions: PermissionKey[];
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserWithAccessById(userId: UserId): Promise<UserWithAccess | null>;
  createCustomer(input: { email: string; passwordHash: string; marketingConsent?: boolean }): Promise<User>;
  updatePasswordAndDeleteSessions(userId: UserId, passwordHash: string): Promise<void>;
  createSession(input: {
    userId: UserId;
    tokenHash: string;
    expiresAt: Date;
    trackCustomerLogin?: boolean;
  }): Promise<Session>;
  findSessionByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteSession(sessionId: string): Promise<void>;
}

function toUser(record: PrismaUser): User {
  return {
    ...record,
    id: record.id as UserId,
    status: record.status as UserStatus,
    type: record.type as UserType,
  };
}

function toSession(record: PrismaSession): Session {
  return {
    id: record.id,
    userId: record.userId as UserId,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

function toUserWithAccess(record: PrismaUserWithAccess): UserWithAccess {
  const roles = record.type === "ADMIN" ? record.userRoles.map(({ role }) => ({
    id: role.id as RoleId,
    name: role.name,
    description: role.description,
    createdAt: role.createdAt,
  })) : [];
  const permissions = record.type === "ADMIN" ? record.userRoles.flatMap(({ role }) =>
    role.rolePermissions.map(({ permission }) => permission.key as PermissionKey),
  ) : [];

  return {
    user: toUser(record),
    roles,
    permissions: [...new Set(permissions)],
  };
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const record = await this.db.user.findUnique({ where: { email } });
    return record ? toUser(record) : null;
  }

  async findUserWithAccessById(userId: UserId): Promise<UserWithAccess | null> {
    const record = await this.db.user.findUnique({
      where: { id: userId },
      ...userWithAccessArgs,
    });
    return record ? toUserWithAccess(record) : null;
  }

  async createCustomer(input: { email: string; passwordHash: string; marketingConsent?: boolean }): Promise<User> {
    const record = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        type: "CUSTOMER",
        status: "ACTIVE",
        marketingConsent: input.marketingConsent === true,
        marketingConsentAt: input.marketingConsent === true ? new Date() : null,
      },
    });

    return toUser(record);
  }

  async updatePasswordAndDeleteSessions(userId: UserId, passwordHash: string): Promise<void> {
    await this.db.$transaction([
      this.db.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.db.session.deleteMany({ where: { userId } }),
    ]);
  }

  async createSession(input: {
    userId: UserId;
    tokenHash: string;
    expiresAt: Date;
    trackCustomerLogin?: boolean;
  }): Promise<Session> {
    const { trackCustomerLogin, ...sessionInput } = input;
    const record = await this.db.$transaction(async (transaction) => {
      const created = await transaction.session.create({ data: sessionInput });
      if (trackCustomerLogin) {
        const now = new Date();
        await transaction.user.updateMany({
          where: { id: input.userId, type: "CUSTOMER", firstLoginAt: null },
          data: { firstLoginAt: now },
        });
        await transaction.user.updateMany({
          where: { id: input.userId, type: "CUSTOMER" },
          data: { lastLoginAt: now, loginCount: { increment: 1 } },
        });
      }
      return created;
    });
    return toSession(record);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    const record = await this.db.session.findUnique({ where: { tokenHash } });
    return record ? toSession(record) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.session.delete({ where: { id: sessionId } });
  }
}
