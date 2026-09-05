import "server-only";

import { AppError, NotFoundError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { InventoryItemId, AdjustInventoryInput } from "../types";
import type { InventoryItemRepository, InventoryRepository } from "../infrastructure/repository";
import type { InventoryPage, InventoryProduct, InventoryQuery } from "../types";
import type { AuditMutationContext } from "@/modules/audit/types";

export function createInventoryService(repository: InventoryItemRepository) {
  return {
    findById: (id: InventoryItemId) => repository.findById(id),
    create: (input: AdjustInventoryInput) => repository.create(input),
  };
}

export type InventoryItemService = ReturnType<typeof createInventoryService>;

export class InventoryService {
  constructor(private readonly repository: InventoryRepository, private readonly authorization: AuthorizationService) {}

  async getPage(userId: UserId, input: InventoryQuery): Promise<Result<InventoryPage, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, "inventory.view");
    if (!allowed.success) return failure(allowed.error);
    try { return success(await this.repository.findPage(input)); }
    catch (error) { return failure(new AppError("INVENTORY_QUERY_FAILED", "Inventory could not be loaded.", { cause: error })); }
  }

  async updateQuantity(userId: UserId, productId: string, stockQuantity: number, audit?: AuditMutationContext): Promise<Result<InventoryProduct, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, "inventory.update");
    if (!allowed.success) return failure(allowed.error);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return failure(new ValidationError("Stock quantity must be a non-negative whole number."));
    try { return success(await this.repository.updateQuantity(productId, stockQuantity, audit)); }
    catch (error) {
      if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return failure(new NotFoundError("PRODUCT", "Product does not exist."));
      if (error instanceof Error && error.message === "INVENTORY_UNTRACKED") return failure(new ValidationError("Enable inventory tracking before setting a stock quantity."));
      return failure(new AppError("INVENTORY_UPDATE_FAILED", "Stock could not be updated.", { cause: error }));
    }
  }
}
