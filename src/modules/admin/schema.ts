import { z } from "zod";

const manageableStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

const phoneSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().min(1).nullable().optional(),
);

export const createAdminUserSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  phone: phoneSchema,
  password: z.string().min(12),
  roleId: z.string().trim().min(1),
  status: manageableStatusSchema.default("ACTIVE"),
});

export const updateAdminUserSchema = z
  .object({
    userId: z.string().trim().min(1),
    phone: phoneSchema,
    roleId: z.string().trim().min(1).optional(),
    status: manageableStatusSchema.optional(),
  })
  .refine(
    ({ phone, roleId, status }) => phone !== undefined || roleId !== undefined || status !== undefined,
    { message: "At least one user field must be updated." },
  );

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export const updateRoleSchema = z.object({
  roleId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  permissionIds: z.array(z.string().trim().min(1)).optional(),
});

export const deleteRoleSchema = z.object({
  roleId: z.string().trim().min(1),
});
