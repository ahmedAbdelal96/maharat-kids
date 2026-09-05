'use server';

import "server-only";

import { adjustInventorySchema } from "../schema";
import { updateInventoryQuantitySchema } from "../schema";
import type { AdjustInventoryInput } from "../types";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { InventoryService } from "../domain/service";
import { PrismaInventoryRepository } from "../infrastructure/repository";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { failure } from "@/core/result";
import { ValidationError } from "@/core/errors";

/**
 * Server Action boundary. Add authentication, permission checks, and the
 * feature mutation here when this capability is implemented.
 */
export async function validateAdjustInventoryAction(
  input: AdjustInventoryInput,
): Promise<AdjustInventoryInput> {
  return adjustInventorySchema.parse(input);
}

function service() { return new InventoryService(new PrismaInventoryRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }

export async function updateInventoryQuantity(input: unknown) {
  const parsed = updateInventoryQuantitySchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please enter a non-negative whole number."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const result = await service().updateQuantity(actor.data.user.id, parsed.data.productId, parsed.data.stockQuantity, { actor: { userId: actor.data.user.id, name: actor.data.user.name, email: actor.data.user.email } });
  if (result.success) { revalidatePath("/admin/inventory"); revalidatePath("/admin"); revalidatePath("/products", "layout"); revalidatePath("/", "layout"); }
  return result;
}
