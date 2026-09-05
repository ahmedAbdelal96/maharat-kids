import { AppError, UnauthorizedError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService, PasswordHasher } from "@/modules/identity/domain/services";
import type { CreateSessionInput, Session, UserId } from "@/modules/identity/types";

import { SESSION_TTL_DAYS } from "../constants";
import { canAuthenticate, isSessionExpired } from "./rules";
import { invalidLoginError } from "./policies";
import type { LoginInput, AuthenticatedUser } from "../types";
import type { RegisterCustomerInput } from "../types";
import type { AuthRepository } from "../infrastructure/repository";
import type { SessionManager } from "../providers/session-manager";
import { normalizeEmail } from "@/modules/identity/domain/rules";

function operationError(operation: string, cause: unknown): AppError {
  return new AppError(
    "AUTH_OPERATION_FAILED",
    `Authentication operation failed: ${operation}.`,
    { cause },
  );
}

function toAuthenticatedUser(
  record: Awaited<ReturnType<AuthRepository["findUserWithAccessById"]>>,
  session: Session,
): AuthenticatedUser {
  if (!record) {
    throw new Error("Cannot create an authenticated user without a user record.");
  }

  const { passwordHash, ...safeUser } = record.user;
  void passwordHash;

  return {
    user: safeUser,
    session,
    roles: record.roles,
    permissions: record.permissions,
  };
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionManager: SessionManager,
    private readonly authorization: AuthorizationService,
  ) {}

  async login(input: LoginInput): Promise<Result<AuthenticatedUser, AppError>> {
    try {
      const user = await this.repository.findUserByEmail(input.email);

      if (!user || !canAuthenticate(user)) {
        return failure(invalidLoginError());
      }

      const passwordMatches = await this.passwordHasher.verify(
        input.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return failure(invalidLoginError());
      }

      const authenticated = await this.createSessionForUser(user.id);
      return authenticated.success ? success(authenticated.data) : failure(authenticated.error);
    } catch (error) {
      return failure(operationError("login", error));
    }
  }

  async registerCustomer(
    input: RegisterCustomerInput,
  ): Promise<Result<AuthenticatedUser, AppError>> {
    try {
      const email = normalizeEmail(input.email);
      const existingUser = await this.repository.findUserByEmail(email);

      if (existingUser) {
        return failure(new AppError("EMAIL_ALREADY_IN_USE", "An account with this email already exists."));
      }

      const user = await this.repository.createCustomer({
        email,
        passwordHash: await this.passwordHasher.hash(input.password),
        marketingConsent: input.marketingConsent,
      });

      return this.createSessionForUser(user.id);
    } catch (error) {
      return failure(operationError("customer registration", error));
    }
  }

  async createSessionForUser(userId: UserId): Promise<Result<AuthenticatedUser, AppError>> {
    const userWithAccess = await this.repository.findUserWithAccessById(userId);

    if (!userWithAccess || !canAuthenticate(userWithAccess.user)) {
      return failure(invalidLoginError());
    }

    const sessionInput: CreateSessionInput = {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
      trackCustomerLogin: userWithAccess.user.type === "CUSTOMER",
    };
    const session = await this.sessionManager.create(sessionInput);

    if (!session.success) {
      return failure(session.error);
    }

    return success(toAuthenticatedUser(userWithAccess, session.data));
  }

  async logout(sessionId: string): Promise<Result<true, AppError>> {
    try {
      return await this.sessionManager.revoke(sessionId);
    } catch (error) {
      return failure(operationError("logout", error));
    }
  }

  async getCurrentUser(): Promise<Result<AuthenticatedUser | null, AppError>> {
    try {
      const session = await this.sessionManager.getCurrent();

      if (!session.success) {
        return failure(session.error);
      }

      if (!session.data || isSessionExpired(session.data)) {
        return success(null);
      }

      const userWithAccess = await this.repository.findUserWithAccessById(
        session.data.userId,
      );

      if (!userWithAccess || !canAuthenticate(userWithAccess.user)) {
        return success(null);
      }

      return success(toAuthenticatedUser(userWithAccess, session.data));
    } catch (error) {
      return failure(operationError("get current user", error));
    }
  }

  async requireAuthenticatedUser(): Promise<Result<AuthenticatedUser, AppError>> {
    const currentUser = await this.getCurrentUser();

    if (!currentUser.success) {
      return failure(currentUser.error);
    }

    return currentUser.data
      ? success(currentUser.data)
      : failure(new UnauthorizedError());
  }

  async requirePermission(permission: string): Promise<Result<true, AppError>> {
    const currentUser = await this.requireAuthenticatedUser();

    if (!currentUser.success) {
      return failure(currentUser.error);
    }

    return this.requirePermissionForUser(currentUser.data.user.id, permission);
  }

  async requirePermissionForUser(
    userId: UserId,
    permission: string,
  ): Promise<Result<true, AppError>> {
    return this.authorization.requirePermission(userId, permission);
  }
}
