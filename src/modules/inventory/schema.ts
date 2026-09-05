import { z } from "zod";

export const inventoryItemIdSchema = z.string().trim().min(1);

export const adjustInventorySchema = z.object({
  productId: z.string().trim().min(1),
  quantityDelta: z.number().int(),
});

export const inventoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z.enum(["ALL", "TRACKED", "UNTRACKED", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateInventoryQuantitySchema = z.object({
  productId: z.string().trim().min(1),
  stockQuantity: z.number().int().min(0).max(2147483647),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
