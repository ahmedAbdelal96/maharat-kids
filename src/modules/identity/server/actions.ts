'use server';

import "server-only";

import {
  assignRoleSchema,
  createPermissionSchema,
  createRoleSchema,
  createUserSchema,
  updateUserSchema,
} from "../schema";
import type {
  AssignRoleInput,
  CreatePermissionInput,
  CreateRoleInput,
  CreateUserInput,
  UpdateUserInput,
} from "../types";

/** Validation-only identity management boundaries for future application actions. */
export async function validateCreateUserAction(
  input: unknown,
): Promise<CreateUserInput> {
  return createUserSchema.parse(input);
}

export async function validateUpdateUserAction(
  input: unknown,
): Promise<UpdateUserInput> {
  return updateUserSchema.parse(input);
}

export async function validateCreateRoleAction(
  input: unknown,
): Promise<CreateRoleInput> {
  return createRoleSchema.parse(input);
}

export async function validateAssignRoleAction(
  input: unknown,
): Promise<AssignRoleInput> {
  return assignRoleSchema.parse(input);
}

export async function validateCreatePermissionAction(
  input: unknown,
): Promise<CreatePermissionInput> {
  return createPermissionSchema.parse(input);
}
