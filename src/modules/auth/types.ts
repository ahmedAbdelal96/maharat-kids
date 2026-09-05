import type { z } from "zod";

import {
  loginSchema,
  registerCustomerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyPasswordResetCodeSchema,
} from "./schema";
import type {
  PermissionKey,
  Role,
  SafeUser,
  Session,
} from "@/modules/identity/types";

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type VerifyPasswordResetCodeInput = z.infer<typeof verifyPasswordResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type AuthenticatedUser = {
  user: SafeUser;
  session: Session;
  roles: Role[];
  permissions: PermissionKey[];
};
