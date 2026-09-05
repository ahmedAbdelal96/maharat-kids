"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { addProductToCartSchema, cartItemIdSchema, couponCodeSchema, updateCartItemQuantitySchema } from "../schema";
import { CartService } from "../domain/service";
import { PrismaCartRepository } from "../infrastructure/repository";
import { resolveShoppingCartContext } from "./context";

function service() { return new CartService(new PrismaCartRepository()); }
function refresh() { revalidatePath("/cart"); revalidatePath("/checkout"); revalidatePath("/"); }

export async function addProductToCart(input: unknown) {
  const parsed = addProductToCartSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid product quantity."));
  const context = await resolveShoppingCartContext({ createGuest: true });
  if (!context.success) return failure(context.error);
  if (!context.data) return failure(new ValidationError("The cart could not be created."));
  const result = await service().addProduct(context.data, parsed.data.productId, parsed.data.quantity);
  if (result.success) refresh();
  return result;
}

export async function updateCartItemQuantity(input: unknown) {
  const parsed = updateCartItemQuantitySchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid quantity."));
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  if (!context.data) return service().clear({ kind: "guest", guestTokenHash: "missing-cart" });
  const result = await service().updateQuantity(context.data, parsed.data.cartItemId, parsed.data.quantity);
  if (result.success) refresh();
  return result;
}

export async function removeCartItem(input: unknown) {
  const parsed = cartItemIdSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid cart item."));
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  if (!context.data) return service().clear({ kind: "guest", guestTokenHash: "missing-cart" });
  const result = await service().removeItem(context.data, parsed.data.cartItemId);
  if (result.success) refresh();
  return result;
}

export async function clearCart() {
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  if (!context.data) return service().clear({ kind: "guest", guestTokenHash: "missing-cart" });
  const result = await service().clear(context.data);
  if (result.success) refresh();
  return result;
}

export async function applyCouponToCart(input: unknown) {
  const parsed = couponCodeSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Enter a valid coupon code."));
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  if (!context.data) return failure(new ValidationError("Your cart is empty."));
  const result = await service().applyCoupon(context.data, parsed.data.code);
  if (result.success) refresh();
  return result;
}

export async function removeCouponFromCart() {
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  if (!context.data) return service().clear({ kind: "guest", guestTokenHash: "missing-cart" });
  const result = await service().removeCoupon(context.data);
  if (result.success) refresh();
  return result;
}
