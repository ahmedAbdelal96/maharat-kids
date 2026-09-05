import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";

import { normalizeEmail } from "./rules";
import type {
  AssignRoleInput,
  CreatePermissionInput,
  CreateRoleInput,
  CreateSessionInput,
  CreateUserInput,
  PermissionKey,
  Role,
  RoleId,
  SafeUser,
  Session,
  UpdateUserInput,
  User,
  UserId,
  UserType,
} from "../types";
import type {
  PermissionRepository,
  RoleRepository,
  UserRepository,
} from "../infrastructure/repository";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface SessionManager {
  create(input: CreateSessionInput): Promise<Result<Session, AppError>>;
  getCurrent(): Promise<Result<Session | null, AppError>>;
  revoke(sessionId: string): Promise<Result<true, AppError>>;
}

export type IdentityRepositories = {
  users: UserRepository;
  roles: RoleRepository;
  permissions: PermissionRepository;
};

function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}

function operationError(operation: string, cause: unknown): AppError {
  return new AppError(
    "IDENTITY_OPERATION_FAILED",
    `Identity operation failed: ${operation}.`,
    undefined,
    { cause },
  );
}

export class IdentityService {
  constructor(
    private readonly repositories: IdentityRepositories,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async getUser(userId: UserId): Promise<Result<SafeUser, AppError>> {
    try {
      const user = await this.repositories.users.findById(userId);
      return user
        ? success(toSafeUser(user))
        : failure(new NotFoundError("USER", "User does not exist.", { userId }));
    } catch (error) {
      return failure(operationError("get user", error));
    }
  }

  async createUser(input: CreateUserInput): Promise<Result<SafeUser, AppError>> {
    try {
      const email = normalizeEmail(input.email);
      const existingUser = await this.repositories.users.findByEmail(email);

      if (existingUser) {
        return failure(
          new AppError("USER_EMAIL_IN_USE", "A user with this email already exists.", {
            email,
          }),
        );
      }

      const user = await this.repositories.users.create({
        email,
        phone: input.phone ?? null,
        passwordHash: await this.passwordHasher.hash(input.password),
        type: "CUSTOMER" satisfies UserType,
        status: input.status,
      });

      return success(toSafeUser(user));
    } catch (error) {
      return failure(operationError("create user", error));
    }
  }

  async updateUser(
    userId: UserId,
    input: UpdateUserInput,
  ): Promise<Result<SafeUser, AppError>> {
    try {
      const user = await this.repositories.users.findById(userId);

      if (!user) {
        return failure(new NotFoundError("USER", "User does not exist.", { userId }));
      }

      const updatedUser = await this.repositories.users.update(userId, {
        email: input.email ? normalizeEmail(input.email) : undefined,
        phone: input.phone,
        passwordHash: input.password
          ? await this.passwordHasher.hash(input.password)
          : undefined,
        status: input.status,
      });

      return success(toSafeUser(updatedUser));
    } catch (error) {
      return failure(operationError("update user", error));
    }
  }

  async createRole(input: CreateRoleInput): Promise<Result<Role, AppError>> {
    try {
      const existingRole = await this.repositories.roles.findByName(input.name);

      if (existingRole) {
        return failure(
          new AppError("ROLE_NAME_IN_USE", "A role with this name already exists.", {
            name: input.name,
          }),
        );
      }

      return success(
        await this.repositories.roles.create({
          name: input.name,
          description: input.description ?? null,
        }),
      );
    } catch (error) {
      return failure(operationError("create role", error));
    }
  }

  async assignRole(input: AssignRoleInput): Promise<Result<true, AppError>> {
    try {
      const [user, role] = await Promise.all([
        this.repositories.users.findById(input.userId as UserId),
        this.repositories.roles.findById(input.roleId as RoleId),
      ]);

      if (!user) {
        return failure(new NotFoundError("USER", "User does not exist.", { userId: input.userId }));
      }

      if (!role) {
        return failure(new NotFoundError("ROLE", "Role does not exist.", { roleId: input.roleId }));
      }

      if (user.type !== "ADMIN") {
        return failure(
          new ForbiddenError("Customer accounts cannot receive administration roles.", {
            userId: input.userId,
            roleId: input.roleId,
          }),
        );
      }

      await this.repositories.roles.assignToUser(
        input.userId as UserId,
        input.roleId as RoleId,
      );

      return success(true);
    } catch (error) {
      return failure(operationError("assign role", error));
    }
  }

  async createPermission(
    input: CreatePermissionInput,
  ): Promise<Result<PermissionKey, AppError>> {
    try {
      const existingPermission = await this.repositories.permissions.findByKey(input.key);

      if (existingPermission) {
        return failure(
          new AppError(
            "PERMISSION_KEY_IN_USE",
            "A permission with this key already exists.",
            { key: input.key },
          ),
        );
      }

      const permission = await this.repositories.permissions.create({
        key: input.key as PermissionKey,
        description: input.description ?? null,
      });

      return success(permission.key);
    } catch (error) {
      return failure(operationError("create permission", error));
    }
  }
}

export class AuthorizationService {
  constructor(
    private readonly permissions: PermissionRepository,
    private readonly users: UserRepository,
  ) {}

  async hasPermission(
    userId: UserId,
    permission: string,
  ): Promise<Result<boolean, AppError>> {
    try {
      const user = await this.users.findById(userId);

      if (!user || user.type !== "ADMIN") {
        return success(false);
      }

      const keys = await this.permissions.listKeysForUser(userId);
      return success(keys.includes(permission as PermissionKey));
    } catch (error) {
      return failure(operationError("check permission", error));
    }
  }

  async requirePermission(
    userId: UserId,
    permission: string,
  ): Promise<Result<true, AppError>> {
    const result = await this.hasPermission(userId, permission);

    if (!result.success) {
      return failure(result.error);
    }

    return result.data
      ? success(true)
      : failure(
          new ForbiddenError("You do not have the required permission.", {
            userId,
            permission,
          }),
        );
  }
}
