import type { z } from "zod";

import {
  assignRoleSchema,
  createPermissionSchema,
  createRoleSchema,
  createUserSchema,
  updateUserSchema,
} from "./schema";
import type { UserStatus, UserType } from "./constants";

export type { UserStatus, UserType } from "./constants";

export type UserId = string & { readonly __brand: "UserId" };
export type RoleId = string & { readonly __brand: "RoleId" };
export type PermissionId = string & { readonly __brand: "PermissionId" };
export type PermissionKey = string & { readonly __brand: "PermissionKey" };

export type User = {
  id: UserId;
  email: string | null;
  name: string | null;
  phone: string | null;
  passwordHash: string | null;
  type: UserType;
  status: UserStatus;
  firstLoginAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  marketingConsent: boolean;
  marketingConsentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SafeUser = Omit<User, "passwordHash">;

export type Role = {
  id: RoleId;
  name: string;
  description: string | null;
  createdAt: Date;
};

export type Permission = {
  id: PermissionId;
  key: PermissionKey;
  description: string | null;
};

export type UserRole = {
  userId: UserId;
  roleId: RoleId;
  assignedAt: Date;
};

export type RolePermission = {
  roleId: RoleId;
  permissionId: PermissionId;
  assignedAt: Date;
};

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

export type Session = {
  id: string;
  userId: UserId;
  expiresAt: Date;
  createdAt: Date;
};

export type CreateSessionInput = {
  userId: UserId;
  expiresAt: Date;
  trackCustomerLogin?: boolean;
};
