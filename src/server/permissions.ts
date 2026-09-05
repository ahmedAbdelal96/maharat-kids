import "server-only";

import { ForbiddenError } from "@/core/errors";
import type { AuthSession } from "./auth";

export type Permission =
  | "catalog:read"
  | "catalog:write"
  | "orders:read"
  | "orders:write"
  | "customers:read"
  | "inventory:write";

export function hasPermission(
  session: AuthSession,
  permission: Permission,
): boolean {
  return session.roles.includes("admin") || session.roles.includes(permission);
}

export function requirePermission(
  session: AuthSession,
  permission: Permission,
): void {
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}.`, {
      permission,
    });
  }
}
