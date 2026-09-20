import { z } from "zod";

export const productIdSchema = z.string().trim().min(1);

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  nameAr: z.string().trim().min(1).optional(),
  nameEn: z.string().trim().min(1).optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  sku: z.string().trim().max(100).nullable().optional(),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid amount."),
  compareAtPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Compare-at price must be a valid amount.").nullable().optional(),
  marketPrices: z.object({ saudiPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/), saudiCompareAtPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), egyptPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/), egyptCompareAtPrice: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).nullable().optional() }),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(),
  categoryIds: z.array(z.string().trim().min(1)).optional(),
  primaryCategoryId: z.string().trim().min(1).nullable().optional(),
  minAgeMonths: z.number().int().min(0).max(240).nullable().optional(),
  maxAgeMonths: z.number().int().min(0).max(240).nullable().optional(),
  productLanguage: z.enum(["ARABIC", "ENGLISH", "BILINGUAL", "LANGUAGE_INDEPENDENT"]).optional(),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).nullable().optional(),
  skillIds: z.array(z.string().trim().min(1)).optional(),
  learningObjectiveIds: z.array(z.string().trim().min(1)).optional(),
  productTypeIds: z.array(z.string().trim().min(1)).optional(),
  useContextIds: z.array(z.string().trim().min(1)).optional(),
  ageGroupIds: z.array(z.string().trim().min(1)).optional(),
  materials: z.string().trim().max(2000).nullable().optional(),
  numberOfPieces: z.number().int().min(0).nullable().optional(),
  dimensions: z.string().trim().max(300).nullable().optional(),
  recommendedPlayers: z.string().trim().max(120).nullable().optional(),
  supervisionRequired: z.boolean().optional(),
  safetyNotes: z.string().trim().max(3000).nullable().optional(),
  usageInstructions: z.string().trim().max(5000).nullable().optional(),
  trackInventory: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(2147483647).optional(),
  images: z.array(z.object({ mediaId: z.string().trim().min(1), altText: z.string().trim().max(300).nullable().optional(), sortOrder: z.number().int().min(0).max(9999).optional(), isPrimary: z.boolean().optional() })).max(20).optional(),
});

export const updateProductSchema = createProductSchema.extend({ id: productIdSchema });
export const adjustProductStockSchema = z.object({
  id: productIdSchema,
  quantityDelta: z.number().int().min(-2147483647).max(2147483647).refine((value) => value !== 0, "Stock adjustment cannot be zero."),
});
export const productQuerySchema = z.object({ search: z.string().trim().max(100).optional(), categorySlug: z.string().trim().optional(), categoryId: z.string().trim().optional(), ageMonths: z.coerce.number().int().min(0).max(240).optional(), skillIds: z.array(z.string().trim().min(1)).optional(), productTypeIds: z.array(z.string().trim().min(1)).optional(), language: z.enum(["ARABIC", "ENGLISH", "BILINGUAL", "LANGUAGE_INDEPENDENT"]).optional(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(), featured: z.coerce.boolean().optional(), minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), inStock: z.coerce.boolean().optional(), page: z.coerce.number().int().min(1).max(10000).optional(), pageSize: z.coerce.number().int().min(1).max(48).optional() });

export type CreateProductInput = z.infer<typeof createProductSchema>;
