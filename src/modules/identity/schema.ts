import { z } from "zod";

import { userStatuses } from "./constants";

export const userStatusSchema = z.enum(userStatuses);

export const createUserSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(1).optional(),
  password: z.string().min(12),
  status: userStatusSchema.default("PENDING"),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase())
    .optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  password: z.string().min(12).optional(),
  status: userStatusSchema.optional(),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export const assignRoleSchema = z.object({
  userId: z.string().trim().min(1),
  roleId: z.string().trim().min(1),
});

export const createPermissionSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/),
  description: z.string().trim().max(500).optional(),
});
