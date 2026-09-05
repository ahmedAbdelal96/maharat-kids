import "server-only";

import {
  PrismaClient,
  type Prisma,
  type Permission as PrismaPermission,
  type Role as PrismaRole,
  type User as PrismaUser,
} from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";
import { ADMIN_PERMISSIONS } from "../constants";
import { isSystemRoleName } from "../domain/policies";
import type { AdminRole, AdminUser } from "../types";
import type {
  Permission,
  PermissionId,
  PermissionKey,
  Role,
  RoleId,
  UserId,
  UserStatus,
  UserType,
} from "@/modules/identity/types";

const adminUserArgs = {
  include: {
    userRoles: {
      include: {
        role: {
          select: { id: true, name: true, description: true, createdAt: true },
        },
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

const adminRoleArgs = {
  include: {
    userRoles: { select: { userId: true } },
    rolePermissions: {
      include: {
        permission: { select: { id: true, key: true, description: true } },
      },
    },
  },
} satisfies Prisma.RoleDefaultArgs;

type PrismaAdminUser = Prisma.UserGetPayload<typeof adminUserArgs>;
type PrismaAdminRole = Prisma.RoleGetPayload<typeof adminRoleArgs>;

const adminRoleFilter = {
  OR: [
    { name: "ADMIN" },
    {
      rolePermissions: {
        some: { permission: { key: ADMIN_PERMISSIONS.access } },
      },
    },
  ],
  NOT: { name: "CUSTOMER" },
} satisfies Prisma.RoleWhereInput;

function toRole(record: Pick<PrismaRole, "id" | "name" | "description" | "createdAt">): Role {
  return {
    id: record.id as RoleId,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
  };
}

function toPermission(record: PrismaPermission): Permission {
  return {
    id: record.id as PermissionId,
    key: record.key as PermissionKey,
    description: record.description,
  };
}

function toAdminUser(record: PrismaAdminUser): AdminUser {
  return {
    id: record.id as UserId,
    email: record.email,
    name: record.name,
    phone: record.phone,
    type: record.type as UserType,
    status: record.status as UserStatus,
    firstLoginAt: record.firstLoginAt,
    lastLoginAt: record.lastLoginAt,
    loginCount: record.loginCount,
    marketingConsent: record.marketingConsent,
    marketingConsentAt: record.marketingConsentAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    roles: record.userRoles.map(({ role }) => toRole(role)),
  };
}

function toAdminRole(record: PrismaAdminRole): AdminRole {
  const permissionKeys = record.rolePermissions.map(({ permission }) => permission.key);

  return {
    ...toRole(record),
    userCount: record.userRoles.length,
    permissionCount: record.rolePermissions.length,
    permissionKeys,
    isSystemRole: isSystemRoleName(record.name),
  };
}

export interface AdminUserRepository {
  findAdminUsers(): Promise<AdminUser[]>;
  findAdminUserById(userId: UserId): Promise<AdminUser | null>;
  findUserByEmail(email: string): Promise<Pick<PrismaUser, "id"> | null>;
  createAdminUser(input: {
    email: string;
    phone: string | null;
    passwordHash: string;
    status: UserStatus;
    roleId: RoleId;
  }): Promise<AdminUser>;
  updateAdminUser(input: {
    userId: UserId;
    phone?: string | null;
    status?: UserStatus;
    roleId?: RoleId;
  }): Promise<AdminUser>;
}

export interface AdminRoleRepository {
  findRoles(): Promise<AdminRole[]>;
  findRoleById(roleId: RoleId): Promise<AdminRole | null>;
  findRoleByNameInsensitive(name: string): Promise<Role | null>;
  findAdminRoleOptions(): Promise<Role[]>;
  findPermissions(): Promise<Permission[]>;
  createRole(input: { name: string; description: string | null }): Promise<AdminRole>;
  updateRole(input: {
    roleId: RoleId;
    name?: string;
    description?: string | null;
    permissionIds?: PermissionId[];
  }): Promise<AdminRole>;
  deleteRole(roleId: RoleId): Promise<{ deleted: boolean; assignedUserCount: number }>;
}

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(protected readonly db: PrismaClient = getPrismaClient()) {}

  async findAdminUsers(): Promise<AdminUser[]> {
    const records = await this.db.user.findMany({
      where: { type: "ADMIN" },
      ...adminUserArgs,
      orderBy: { createdAt: "desc" },
    });

    return records.map(toAdminUser);
  }

  async findAdminUserById(userId: UserId): Promise<AdminUser | null> {
    const record = await this.db.user.findFirst({
      where: { id: userId, type: "ADMIN" },
      ...adminUserArgs,
    });

    return record ? toAdminUser(record) : null;
  }

  async findUserByEmail(email: string): Promise<Pick<PrismaUser, "id"> | null> {
    return this.db.user.findUnique({ where: { email }, select: { id: true } });
  }

  async createAdminUser(input: {
    email: string;
    phone: string | null;
    passwordHash: string;
    status: UserStatus;
    roleId: RoleId;
  }): Promise<AdminUser> {
    const userId = await this.db.$transaction(async (transaction) => {
      const role = await transaction.role.findFirst({
        where: { id: input.roleId, name: { not: "CUSTOMER" }, ...adminRoleFilter },
      });

      if (!role) {
        throw new Error("The selected role cannot access administration.");
      }

      const user = await transaction.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          passwordHash: input.passwordHash,
          type: "ADMIN",
          status: input.status,
        },
      });

      await transaction.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });

      return user.id as UserId;
    });

    const created = await this.findAdminUserById(userId);

    if (!created) {
      throw new Error("Created administration user could not be loaded.");
    }

    return created;
  }

  async updateAdminUser(input: {
    userId: UserId;
    phone?: string | null;
    status?: UserStatus;
    roleId?: RoleId;
  }): Promise<AdminUser> {
    await this.db.$transaction(async (transaction) => {
      if (input.roleId) {
        const role = await transaction.role.findFirst({
          where: { id: input.roleId, name: { not: "CUSTOMER" }, ...adminRoleFilter },
        });

        if (!role) {
          throw new Error("The selected role cannot access administration.");
        }

        await transaction.userRole.deleteMany({ where: { userId: input.userId } });
        await transaction.userRole.create({
          data: { userId: input.userId, roleId: role.id },
        });
      }

      await transaction.user.update({
        where: { id: input.userId },
        data: {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    });

    const updated = await this.findAdminUserById(input.userId);

    if (!updated) {
      throw new Error("Updated administration user could not be loaded.");
    }

    return updated;
  }
}

export class PrismaAdminRoleRepository implements AdminRoleRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findRoles(): Promise<AdminRole[]> {
    const records = await this.db.role.findMany({
      where: { name: { not: "CUSTOMER" } },
      ...adminRoleArgs,
      orderBy: { name: "asc" },
    });

    return records.map(toAdminRole);
  }

  async findRoleById(roleId: RoleId): Promise<AdminRole | null> {
    const record = await this.db.role.findUnique({
      where: { id: roleId },
      ...adminRoleArgs,
    });

    return record ? toAdminRole(record) : null;
  }

  async findRoleByNameInsensitive(name: string): Promise<Role | null> {
    const record = await this.db.role.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    return record ? toRole(record) : null;
  }

  async findAdminRoleOptions(): Promise<Role[]> {
    const records = await this.db.role.findMany({
      where: { name: { not: "CUSTOMER" }, ...adminRoleFilter },
      orderBy: { name: "asc" },
    });

    return records.map(toRole);
  }

  async findPermissions(): Promise<Permission[]> {
    const records = await this.db.permission.findMany({ orderBy: { key: "asc" } });
    return records.map(toPermission);
  }

  async createRole(input: { name: string; description: string | null }): Promise<AdminRole> {
    const role = await this.db.role.create({ data: input });
    const created = await this.findRoleById(role.id as RoleId);

    if (!created) {
      throw new Error("Created role could not be loaded.");
    }

    return created;
  }

  async updateRole(input: {
    roleId: RoleId;
    name?: string;
    description?: string | null;
    permissionIds?: PermissionId[];
  }): Promise<AdminRole> {
    await this.db.$transaction(async (transaction) => {
      await transaction.role.update({
        where: { id: input.roleId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });

      if (input.permissionIds !== undefined) {
        await transaction.rolePermission.deleteMany({ where: { roleId: input.roleId } });
        if (input.permissionIds.length > 0) {
          await transaction.rolePermission.createMany({
            data: input.permissionIds.map((permissionId) => ({
              roleId: input.roleId,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    const updated = await this.findRoleById(input.roleId);

    if (!updated) {
      throw new Error("Updated role could not be loaded.");
    }

    return updated;
  }

  async deleteRole(roleId: RoleId): Promise<{ deleted: boolean; assignedUserCount: number }> {
    return this.db.$transaction(async (transaction) => {
      const assignedUserCount = await transaction.userRole.count({ where: { roleId } });

      if (assignedUserCount > 0) {
        return { deleted: false, assignedUserCount };
      }

      await transaction.role.delete({ where: { id: roleId } });
      return { deleted: true, assignedUserCount: 0 };
    });
  }
}
