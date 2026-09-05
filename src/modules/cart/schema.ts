import { z } from "zod";

export const cartItemIdSchema = z.object({
  cartItemId: z.string().trim().min(1),
});

export const updateCartItemQuantitySchema = z.object({
  cartItemId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const addProductToCartSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const couponCodeSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),
});
