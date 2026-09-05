import { ADMIN_PERMISSIONS } from "../constants";
import { systemRoles } from "@/modules/identity/constants";
import type { AdminRole } from "../types";

export function canAccessAdmin(permissionKeys: readonly string[]): boolean {
  return permissionKeys.includes(ADMIN_PERMISSIONS.access);
}

export function normalizeRoleName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isSystemRoleName(name: string): boolean {
  const normalizedName = name.toUpperCase();
  return normalizedName === "CUSTOMER" || systemRoles.includes(normalizedName as (typeof systemRoles)[number]);
}

export function isAdminCapableRole(role: Pick<AdminRole, "name" | "permissionKeys">): boolean {
  return role.name !== "CUSTOMER" &&
    (role.name === "ADMIN" || role.permissionKeys.includes(ADMIN_PERMISSIONS.access));
}
