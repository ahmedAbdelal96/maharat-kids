import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(12),
});

export const registerCustomerSchema = z
  .object({
    email: z.string().trim().email("Please enter a valid email address.").transform((email) => email.toLowerCase()),
    password: z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string().min(12, "Password confirmation must be at least 12 characters."),
    marketingConsent: z.boolean().optional().default(false),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
});

export const verifyPasswordResetCodeSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(12),
    confirmPassword: z.string().min(12),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const logoutSchema = z.string().trim().min(1);

export const permissionSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/);
