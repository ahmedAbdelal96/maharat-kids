import type { AuthenticatedUser } from "@/modules/auth/types";
import type { z } from "zod";

import {
  createAdminUserSchema,
  createRoleSchema,
  deleteRoleSchema,
  updateAdminUserSchema,
  updateRoleSchema,
} from "./schema";
import type { Permission, Role, SafeUser } from "@/modules/identity/types";

export type AdminContext = Pick<
  AuthenticatedUser,
  "user" | "roles" | "permissions"
> & { sessionId: string };

export type AdminNavigationItem = {
  key: string;
  href: string;
  permission: string;
};

export type AdminUser = SafeUser & {
  roles: Role[];
};

export type AdminRole = Role & {
  userCount: number;
  permissionCount: number;
  permissionKeys: string[];
  isSystemRole: boolean;
};

export type AdminUsersPageData = {
  users: AdminUser[];
  roles: AdminRole[];
  permissions: Permission[];
};

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>;
