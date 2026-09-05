import "server-only";

import { failure } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { inventoryQuerySchema } from "../schema";
import { InventoryService } from "../domain/service";
import { PrismaInventoryRepository } from "../infrastructure/repository";
import type { InventoryItemService } from "../domain/service";
import type { InventoryItemId } from "../types";

export function createInventoryQueries(service: InventoryItemService) {
  return {
    findById: (id: InventoryItemId) => service.findById(id),
  };
}

function service() { return new InventoryService(new PrismaInventoryRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }

export async function getInventoryPage(input: unknown = {}) {
  const parsed = inventoryQuerySchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Invalid inventory query."));
  const actor = await requireAuthenticatedUser();
  return actor.success ? service().getPage(actor.data.user.id, parsed.data) : failure(actor.error);
}
