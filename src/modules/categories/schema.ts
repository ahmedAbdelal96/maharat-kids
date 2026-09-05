import { z } from "zod";

export const categoryIdSchema = z.string().trim().min(1);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  imageMediaId: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateCategorySchema = createCategorySchema.extend({ id: categoryIdSchema });
export const deleteCategorySchema = z.object({ id: categoryIdSchema });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
