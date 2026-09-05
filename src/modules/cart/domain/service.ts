import "server-only";

import { AppError, NotFoundError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { CartContext, Cart, CartMergeResult } from "../types";
import type { CartRepository } from "../infrastructure/repository";

function mapError(error: unknown): AppError {
  if (error instanceof Error && error.message === "CART_ITEM_NOT_FOUND") return new NotFoundError("CART_ITEM", "Cart item does not exist.");
  if (error instanceof Error && error.message === "PRODUCT_UNAVAILABLE") return new AppError("PRODUCT_UNAVAILABLE", "This product is no longer available.");
  if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return new AppError("INSUFFICIENT_STOCK", "There is not enough stock for this quantity.");
  return new AppError("CART_OPERATION_FAILED", "Cart operation could not be completed.", { cause: error });
}

export class CartService {
  constructor(private readonly repository: CartRepository) {}

  async getCurrentCart(context: CartContext): Promise<Result<Cart, AppError>> {
    try { return success(await this.repository.revalidate(context)); } catch (error) { return failure(mapError(error)); }
  }

  async addProduct(context: CartContext, productId: string, quantity: number): Promise<Result<Cart, AppError>> {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return failure(new ValidationError("Quantity must be between 1 and 99."));
    try { return success(await this.repository.addProduct(context, productId, quantity)); } catch (error) { return failure(mapError(error)); }
  }

  async revalidate(context: CartContext): Promise<Result<Cart, AppError>> {
    try { return success(await this.repository.revalidate(context)); } catch (error) { return failure(mapError(error)); }
  }

  async updateQuantity(context: CartContext, cartItemId: string, quantity: number): Promise<Result<Cart, AppError>> {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return failure(new ValidationError("Quantity must be between 1 and 99."));
    try { return success(await this.repository.updateQuantity(context, cartItemId, quantity)); } catch (error) { return failure(mapError(error)); }
  }

  async removeItem(context: CartContext, cartItemId: string): Promise<Result<Cart, AppError>> {
    try { return success(await this.repository.removeItem(context, cartItemId)); } catch (error) { return failure(mapError(error)); }
  }

  async clear(context: CartContext): Promise<Result<Cart, AppError>> {
    try { return success(await this.repository.clear(context)); } catch (error) { return failure(mapError(error)); }
  }

  async applyCoupon(context: CartContext, code: string): Promise<Result<Cart, AppError>> {
    if (!code.trim()) return failure(new ValidationError("Enter a coupon code."));
    try {
      return success(await this.repository.applyCoupon(context, code));
    } catch (error) {
      if (error instanceof Error && error.message === "COUPON_INVALID") return failure(new AppError("COUPON_INVALID", "This coupon code is not valid."));
      if (error instanceof Error && error.message.startsWith("COUPON_NOT_APPLICABLE:")) return failure(new AppError("COUPON_NOT_APPLICABLE", error.message.slice("COUPON_NOT_APPLICABLE:".length)));
      return failure(mapError(error));
    }
  }

  async removeCoupon(context: CartContext): Promise<Result<Cart, AppError>> {
    try { return success(await this.repository.removeCoupon(context)); } catch (error) { return failure(mapError(error)); }
  }

  async mergeGuestCart(customerId: string, guestTokenHash: string): Promise<Result<CartMergeResult, AppError>> {
    try { return success(await this.repository.mergeGuestCart(customerId, guestTokenHash)); } catch (error) { return failure(mapError(error)); }
  }
}
