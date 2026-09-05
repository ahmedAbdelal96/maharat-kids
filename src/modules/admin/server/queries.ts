import "server-only";

import { failure, success } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";

import { AdminRoleService, AdminUserService } from "../domain/service";
import {
  PrismaAdminRoleRepository,
  PrismaAdminUserRepository,
} from "../infrastructure/repository";
import { createPasswordHasher } from "@/modules/auth/providers/password-hasher";

function createDefaultAuthorizationService(): AuthorizationService {
  return new AuthorizationService(
    new PrismaPermissionRepository(),
    new PrismaUserRepository(),
  );
}

function createDefaultAdminUserService(): AdminUserService {
  return new AdminUserService(
    new PrismaAdminUserRepository(),
    new PrismaAdminRoleRepository(),
    createDefaultAuthorizationService(),
    createPasswordHasher(),
  );
}

function createDefaultAdminRoleService(): AdminRoleService {
  return new AdminRoleService(
    new PrismaAdminRoleRepository(),
    createDefaultAuthorizationService(),
  );
}

export async function getAdminUsersPageData() {
  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  const [users, access] = await Promise.all([
    createDefaultAdminUserService().getAdminUsers(actor.data),
    createDefaultAdminRoleService().getRolesAndPermissions(actor.data),
  ]);

  if (!users.success) {
    return failure(users.error);
  }

  if (!access.success) {
    return failure(access.error);
  }

  return success({
    users: users.data,
    roles: access.data.roles,
    permissions: access.data.permissions,
  });
}

export async function getAdminUsers() {
  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  return createDefaultAdminUserService().getAdminUsers(actor.data);
}

export async function getAdminRoleOptions() {
  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  return createDefaultAdminRoleService().getAdminRoleOptions(actor.data);
}
