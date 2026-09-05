import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { ADMIN_PERMISSIONS } from "../constants";
import { isAdminCapableRole, isSystemRoleName, normalizeRoleName } from "./policies";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AuthorizationService, PasswordHasher } from "@/modules/identity/domain/services";
import { normalizeEmail } from "@/modules/identity/domain/rules";
import type { PermissionId, RoleId, UserId } from "@/modules/identity/types";

import type {
  AdminRole,
  AdminUser,
  CreateAdminUserInput,
  CreateRoleInput,
  DeleteRoleInput,
  UpdateAdminUserInput,
  UpdateRoleInput,
} from "../types";
import type {
  AdminRoleRepository,
  AdminUserRepository,
} from "../infrastructure/repository";

function operationError(operation: string, cause: unknown): AppError {
  return new AppError(
    "ADMIN_ACCESS_OPERATION_FAILED",
    `Administration access operation failed: ${operation}.`,
    { cause },
  );
}

async function requirePermission(
  authorization: AuthorizationService,
  actor: AuthenticatedUser,
  permission: string,
): Promise<Result<true, AppError>> {
  return authorization.requirePermission(actor.user.id, permission);
}

export class AdminUserService {
  constructor(
    private readonly repository: AdminUserRepository,
    private readonly roles: AdminRoleRepository,
    private readonly authorization: AuthorizationService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async getAdminUsers(actor: AuthenticatedUser): Promise<Result<AdminUser[], AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "users.view");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      return success(await this.repository.findAdminUsers());
    } catch (error) {
      return failure(operationError("get administration users", error));
    }
  }

  async createAdminUser(
    actor: AuthenticatedUser,
    input: CreateAdminUserInput,
  ): Promise<Result<AdminUser, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "users.create");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const role = await this.roles.findRoleById(input.roleId as RoleId);

      if (!role || !isAdminCapableRole(role)) {
        return failure(new ForbiddenError("Only admin-capable roles can be assigned to administration users."));
      }

      const email = normalizeEmail(input.email);
      const existingUser = await this.repository.findUserByEmail(email);

      if (existingUser) {
        return failure(new AppError("USER_EMAIL_IN_USE", "A user with this email already exists."));
      }

      const passwordHash = await this.passwordHasher.hash(input.password);
      return success(
        await this.repository.createAdminUser({
          email,
          phone: input.phone ?? null,
          passwordHash,
          status: input.status,
          roleId: input.roleId as RoleId,
        }),
      );
    } catch (error) {
      return failure(operationError("create administration user", error));
    }
  }

  async updateAdminUser(
    actor: AuthenticatedUser,
    input: UpdateAdminUserInput,
  ): Promise<Result<AdminUser, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "users.update");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const target = await this.repository.findAdminUserById(input.userId as UserId);

      if (!target) {
        return failure(new NotFoundError("USER", "Administration user does not exist."));
      }

      if (actor.user.id === input.userId && input.status && input.status !== "ACTIVE") {
        return failure(new ForbiddenError("You cannot deactivate or suspend your own account."));
      }

      if (input.roleId) {
        const role = await this.roles.findRoleById(input.roleId as RoleId);

        if (!role || !isAdminCapableRole(role)) {
          return failure(new ForbiddenError("Only admin-capable roles can be assigned to administration users."));
        }
      }

      return success(
        await this.repository.updateAdminUser({
          userId: input.userId as UserId,
          phone: input.phone,
          status: input.status,
          roleId: input.roleId as RoleId | undefined,
        }),
      );
    } catch (error) {
      return failure(operationError("update administration user", error));
    }
  }
}

export class AdminRoleService {
  constructor(
    private readonly repository: AdminRoleRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async getRolesAndPermissions(actor: AuthenticatedUser): Promise<Result<{ roles: AdminRole[]; permissions: Awaited<ReturnType<AdminRoleRepository["findPermissions"]>> }, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "roles.view");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const [roles, permissions] = await Promise.all([
        this.repository.findRoles(),
        this.repository.findPermissions(),
      ]);

      return success({ roles, permissions });
    } catch (error) {
      return failure(operationError("get roles and permissions", error));
    }
  }

  async getAdminRoleOptions(actor: AuthenticatedUser) {
    const authorized = await requirePermission(this.authorization, actor, "roles.view");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      return success(await this.repository.findAdminRoleOptions());
    } catch (error) {
      return failure(operationError("get administration role options", error));
    }
  }

  async createRole(actor: AuthenticatedUser, input: CreateRoleInput): Promise<Result<AdminRole, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "roles.create");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const name = normalizeRoleName(input.name);

      if (isSystemRoleName(name)) {
        return failure(new ForbiddenError("ADMIN and CUSTOMER are protected system roles."));
      }

      const existing = await this.repository.findRoleByNameInsensitive(name);

      if (existing) {
        return failure(new AppError("ROLE_NAME_IN_USE", "A role with this name already exists."));
      }

      return success(await this.repository.createRole({
        name,
        description: input.description?.trim() || null,
      }));
    } catch (error) {
      return failure(operationError("create role", error));
    }
  }

  async updateRole(actor: AuthenticatedUser, input: UpdateRoleInput): Promise<Result<AdminRole, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "roles.update");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const role = await this.repository.findRoleById(input.roleId as RoleId);

      if (!role) {
        return failure(new NotFoundError("ROLE", "Role does not exist."));
      }

      const name = input.name === undefined ? undefined : normalizeRoleName(input.name);

      if (role.isSystemRole && name !== undefined && name !== role.name) {
        return failure(new ForbiddenError("Protected system roles cannot be renamed."));
      }

      if (!role.isSystemRole && name !== undefined && isSystemRoleName(name)) {
        return failure(new ForbiddenError("ADMIN and CUSTOMER are reserved system role names."));
      }

      if (name !== undefined && name !== role.name) {
        const existing = await this.repository.findRoleByNameInsensitive(name);

        if (existing && existing.id !== role.id) {
          return failure(new AppError("ROLE_NAME_IN_USE", "A role with this name already exists."));
        }
      }

      let permissionIds: PermissionId[] | undefined;

      if (input.permissionIds !== undefined) {
        permissionIds = [...new Set(input.permissionIds)] as PermissionId[];
        const permissions = await this.repository.findPermissions();
        const permissionIdSet = new Set(permissions.map((permission) => permission.id));
        const hasUnknownPermission = permissionIds.some((permissionId) => !permissionIdSet.has(permissionId));

        if (hasUnknownPermission) {
          return failure(new AppError("UNKNOWN_PERMISSION", "The role contains an unknown system permission."));
        }

        const adminAccessPermission = permissions.find(
          (permission) => permission.key === ADMIN_PERMISSIONS.access,
        );
        const actorOwnsRole = actor.roles.some((actorRole) => actorRole.id === role.id);

        if (actorOwnsRole && adminAccessPermission && !permissionIds.includes(adminAccessPermission.id)) {
          return failure(new ForbiddenError("You cannot remove your own final administration access."));
        }
      }

      return success(await this.repository.updateRole({
        roleId: input.roleId as RoleId,
        name,
        description: input.description === undefined ? undefined : input.description.trim() || null,
        permissionIds,
      }));
    } catch (error) {
      return failure(operationError("update role", error));
    }
  }

  async deleteRole(actor: AuthenticatedUser, input: DeleteRoleInput): Promise<Result<true, AppError>> {
    const authorized = await requirePermission(this.authorization, actor, "roles.delete");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const role = await this.repository.findRoleById(input.roleId as RoleId);

      if (!role) {
        return failure(new NotFoundError("ROLE", "Role does not exist."));
      }

      if (role.isSystemRole) {
        return failure(new ForbiddenError("ADMIN and CUSTOMER cannot be deleted."));
      }

      const result = await this.repository.deleteRole(input.roleId as RoleId);

      if (!result.deleted) {
        return failure(new AppError(
          "ROLE_ASSIGNED_TO_USERS",
          "This role cannot be deleted while it is assigned to users.",
          { assignedUserCount: result.assignedUserCount },
        ));
      }

      return success(true);
    } catch (error) {
      return failure(operationError("delete role", error));
    }
  }
}
