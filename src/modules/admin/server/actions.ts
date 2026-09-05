'use server';

import "server-only";

import { revalidatePath } from "next/cache";

import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { createPasswordHasher } from "@/modules/auth/providers/password-hasher";
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
import {
  createAdminUserSchema,
  createRoleSchema,
  deleteRoleSchema,
  updateAdminUserSchema,
  updateRoleSchema,
} from "../schema";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

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

async function getActor() {
  const actor = await requireAuthenticatedUser();
  return actor.success ? actor : failure(actor.error);
}

export async function createAdminUser(input: unknown) {
  const parsed = createAdminUserSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please review the user details.", { issues: parsed.error.issues }));
  }

  const actor = await getActor();

  if (!actor.success) {
    return failure(actor.error);
  }

  const result = await createDefaultAdminUserService().createAdminUser(actor.data, parsed.data);

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.ADMIN_USER_CREATED, entityType: AUDIT_ENTITY_TYPES.ADMIN_USER, entityId: result.data.id, entityLabel: result.data.email });
    revalidatePath("/admin/users");
  }

  return result;
}

export async function updateAdminUser(input: unknown) {
  const parsed = updateAdminUserSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please review the user details.", { issues: parsed.error.issues }));
  }

  const actor = await getActor();

  if (!actor.success) {
    return failure(actor.error);
  }

  const result = await createDefaultAdminUserService().updateAdminUser(actor.data, parsed.data);

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.ADMIN_USER_UPDATED, entityType: AUDIT_ENTITY_TYPES.ADMIN_USER, entityId: result.data.id, entityLabel: result.data.email });
    revalidatePath("/admin/users");
  }

  return result;
}

export async function createRole(input: unknown) {
  const parsed = createRoleSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please review the role details.", { issues: parsed.error.issues }));
  }

  const actor = await getActor();

  if (!actor.success) {
    return failure(actor.error);
  }

  const result = await createDefaultAdminRoleService().createRole(actor.data, parsed.data);

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.ROLE_CREATED, entityType: AUDIT_ENTITY_TYPES.ROLE, entityId: result.data.id, entityLabel: result.data.name });
    revalidatePath("/admin/users");
  }

  return result;
}

export async function updateRole(input: unknown) {
  const parsed = updateRoleSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please review the role details.", { issues: parsed.error.issues }));
  }

  const actor = await getActor();

  if (!actor.success) {
    return failure(actor.error);
  }

  const roleService = createDefaultAdminRoleService();
  const beforePage = await roleService.getRolesAndPermissions(actor.data);
  if (!beforePage.success) return failure(beforePage.error);
  const beforeRole = beforePage.data.roles.find((role) => role.id === parsed.data.roleId);
  const result = await roleService.updateRole(actor.data, parsed.data);

  if (result.success) {
    const beforePermissions = new Set(beforeRole?.permissionKeys ?? []);
    const afterPermissions = new Set(result.data.permissionKeys);
    const added = result.data.permissionKeys.filter((key) => !beforePermissions.has(key));
    const removed = (beforeRole?.permissionKeys ?? []).filter((key) => !afterPermissions.has(key));
    const nameChanged = beforeRole && beforeRole.name !== result.data.name;
    const permissionChanged = added.length > 0 || removed.length > 0;
    if (nameChanged || permissionChanged || (parsed.data.description !== undefined && beforeRole?.description !== result.data.description)) {
      await writeAdminAudit(actor.data, { action: permissionChanged ? AUDIT_ACTIONS.ROLE_PERMISSIONS_CHANGED : AUDIT_ACTIONS.ROLE_UPDATED, entityType: AUDIT_ENTITY_TYPES.ROLE, entityId: result.data.id, entityLabel: result.data.name, changes: { fields: [ ...(nameChanged ? [{ field: "name", before: beforeRole?.name ?? null, after: result.data.name }] : []), ...(permissionChanged ? [{ field: "permissions", before: removed, after: added }] : []) ] }, metadata: { addedPermissions: added, removedPermissions: removed } });
    }
    revalidatePath("/admin/users");
  }

  return result;
}

export async function deleteRole(input: unknown) {
  const parsed = deleteRoleSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please select a valid role.", { issues: parsed.error.issues }));
  }

  const actor = await getActor();

  if (!actor.success) {
    return failure(actor.error);
  }

  const result = await createDefaultAdminRoleService().deleteRole(actor.data, parsed.data);

  if (result.success) {
    await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.ROLE_DELETED, entityType: AUDIT_ENTITY_TYPES.ROLE, entityId: parsed.data.roleId, entityLabel: "Deleted role" });
    revalidatePath("/admin/users");
  }

  return result;
}
