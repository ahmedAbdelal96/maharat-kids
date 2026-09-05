import "server-only";

import { ForbiddenError } from "@/core/errors";
import { failure } from "@/core/result";
import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";
import type { UserId } from "@/modules/identity/types";

import { AuthService } from "../domain/service";
import { PrismaAuthRepository } from "../infrastructure/repository";
import { createPasswordHasher } from "../providers/password-hasher";
import { CookieSessionManager } from "../providers/session-manager";

export function createDefaultAuthService(): AuthService {
  const repository = new PrismaAuthRepository();
  const permissions = new PrismaPermissionRepository();

  return new AuthService(
    repository,
    createPasswordHasher(),
    new CookieSessionManager(repository),
    new AuthorizationService(permissions, new PrismaUserRepository()),
  );
}

export function createAuthQueries(service: AuthService) {
  return {
    getCurrentUser: () => service.getCurrentUser(),
    requireAuthenticatedUser: () => service.requireAuthenticatedUser(),
    requirePermission: (permission: string) => service.requirePermission(permission),
  };
}

export async function getCurrentUser() {
  return createAuthQueries(createDefaultAuthService()).getCurrentUser();
}

export async function requireAuthenticatedUser() {
  return createAuthQueries(createDefaultAuthService()).requireAuthenticatedUser();
}

export async function requireCustomer() {
  const current = await requireAuthenticatedUser();

  if (!current.success) return failure(current.error);

  if (current.data.user.type !== "CUSTOMER") {
    return failure(new ForbiddenError("Please sign in with a customer account to continue."));
  }

  return current;
}

export async function requirePermission(permission: string) {
  return createAuthQueries(createDefaultAuthService()).requirePermission(permission);
}

export async function requirePermissionForUser(userId: UserId, permission: string) {
  return createDefaultAuthService().requirePermissionForUser(userId, permission);
}
