import "server-only";

import { AppError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { ProductRepository } from "@/modules/products/infrastructure/repository";
import type { FavoriteRepository } from "../infrastructure/repository";
import type { FavoriteProduct } from "../types";
import { isInventoryAvailable } from "@/modules/inventory/domain/inventory";

function operationError(operation: string, cause: unknown): AppError {
  return new AppError("FAVORITES_OPERATION_FAILED", `Favorites operation failed: ${operation}.`, { cause });
}

export class FavoritesService {
  constructor(
    private readonly repository: FavoriteRepository,
    private readonly products: ProductRepository,
  ) {}

  async add(customerId: string, productId: string): Promise<Result<true, AppError>> {
    const product = await this.products.findById(productId as never);
    if (!product || product.status !== "ACTIVE") {
      return failure(new NotFoundError("PRODUCT", "This product is not available to save."));
    }

    try {
      await this.repository.add(customerId, { productId });
      return success(true);
    } catch (error) {
      return failure(operationError("save product", error));
    }
  }

  async remove(customerId: string, productId: string): Promise<Result<true, AppError>> {
    try {
      await this.repository.remove(customerId, productId);
      return success(true);
    } catch (error) {
      return failure(operationError("remove product", error));
    }
  }

  async getFavorites(customerId: string): Promise<Result<FavoriteProduct[], AppError>> {
    try {
      const favorites = await this.repository.findByUser(customerId);
      const products = await this.products.findByIds(favorites.map((favorite) => favorite.productId));
      const productsById = new Map(products.map((product) => [product.id, product]));
      return success(
        favorites.flatMap((favorite) => {
          const product = productsById.get(favorite.productId);
          if (!product) return [];
          return [{ favoriteId: favorite.id, createdAt: favorite.createdAt, product, isAvailable: product.status === "ACTIVE" && isInventoryAvailable(product) }];
        }),
      );
    } catch (error) {
      return failure(operationError("load favorites", error));
    }
  }

  async getProductIds(customerId: string): Promise<Result<string[], AppError>> {
    try {
      return success(await this.repository.findProductIds(customerId));
    } catch (error) {
      return failure(operationError("load favorite state", error));
    }
  }
}
