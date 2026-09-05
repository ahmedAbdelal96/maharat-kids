import "server-only";

import {
  PrismaClient,
  type Permission as PrismaPermission,
  type Role as PrismaRole,
  type User as PrismaUser,
} from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";

import type {
  Permission,
  PermissionId,
  PermissionKey,
  Role,
  RoleId,
  User,
  UserId,
  UserRole,
  UserStatus,
  UserType,
} from "../types";

export type CreateUserRecord = Pick<
  User,
  "email" | "phone" | "passwordHash" | "type" | "status"
>;

export type UpdateUserRecord = Partial<
  Pick<User, "email" | "phone" | "passwordHash" | "status">
>;

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserRecord): Promise<User>;
  update(id: UserId, input: UpdateUserRecord): Promise<User>;
}

export interface RoleRepository {
  findById(id: RoleId): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(input: Pick<Role, "name" | "description">): Promise<Role>;
  assignToUser(userId: UserId, roleId: RoleId): Promise<UserRole>;
}

export interface PermissionRepository {
  findByKey(key: string): Promise<Permission | null>;
  create(input: Pick<Permission, "key" | "description">): Promise<Permission>;
  listKeysForUser(userId: UserId): Promise<PermissionKey[]>;
}

function toUser(record: PrismaUser): User {
  return {
    ...record,
    id: record.id as UserId,
    status: record.status as UserStatus,
    type: record.type as UserType,
  };
}

function toRole(record: PrismaRole): Role {
  return { ...record, id: record.id as RoleId };
}

function toPermission(record: PrismaPermission): Permission {
  return {
    ...record,
    id: record.id as PermissionId,
    key: record.key as PermissionKey,
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: UserId): Promise<User | null> {
    const record = await this.db.user.findUnique({ where: { id } });
    return record ? toUser(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.db.user.findUnique({ where: { email } });
    return record ? toUser(record) : null;
  }

  async create(input: CreateUserRecord): Promise<User> {
    return toUser(await this.db.user.create({ data: input }));
  }

  async update(id: UserId, input: UpdateUserRecord): Promise<User> {
    return toUser(await this.db.user.update({ where: { id }, data: input }));
  }
}

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: RoleId): Promise<Role | null> {
    const record = await this.db.role.findUnique({ where: { id } });
    return record ? toRole(record) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const record = await this.db.role.findUnique({ where: { name } });
    return record ? toRole(record) : null;
  }

  async create(input: Pick<Role, "name" | "description">): Promise<Role> {
    return toRole(await this.db.role.create({ data: input }));
  }

  async assignToUser(userId: UserId, roleId: RoleId): Promise<UserRole> {
    const record = await this.db.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });

    return {
      userId: record.userId as UserId,
      roleId: record.roleId as RoleId,
      assignedAt: record.assignedAt,
    };
  }
}

export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByKey(key: string): Promise<Permission | null> {
    const record = await this.db.permission.findUnique({ where: { key } });
    return record ? toPermission(record) : null;
  }

  async create(
    input: Pick<Permission, "key" | "description">,
  ): Promise<Permission> {
    return toPermission(await this.db.permission.create({ data: input }));
  }

  async listKeysForUser(userId: UserId): Promise<PermissionKey[]> {
    const assignments = await this.db.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });

    return assignments.flatMap(({ role }) =>
      role.rolePermissions.map(
        ({ permission }) => permission.key as PermissionKey,
      ),
    );
  }
}
