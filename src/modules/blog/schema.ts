import { z } from "zod";

const safeText = (max: number) => z.string().trim().max(max);
export const blogPostSchema = z.object({
  titleAr: z.string().trim().min(1).max(180), titleEn: z.string().trim().min(1).max(180),
  excerptAr: safeText(500).nullable().optional(), excerptEn: safeText(500).nullable().optional(),
  contentAr: z.string().min(1).max(200000), contentEn: z.string().min(1).max(200000),
  slug: z.string().trim().max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(), coverMediaId: z.string().trim().min(1).nullable().optional(),
  categoryId: z.string().trim().min(1).nullable().optional(), seoTitleAr: safeText(180).nullable().optional(), seoTitleEn: safeText(180).nullable().optional(),
  seoDescriptionAr: safeText(320).nullable().optional(), seoDescriptionEn: safeText(320).nullable().optional(),
  productIds: z.array(z.string().trim().min(1)).max(50).optional(), storeCategoryIds: z.array(z.string().trim().min(1)).max(50).optional(),
});
export const blogCategorySchema = z.object({ nameAr: z.string().trim().min(1).max(120), nameEn: z.string().trim().min(1).max(120), slug: z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), isActive: z.boolean().optional(), sortOrder: z.number().int().min(0).max(9999).optional() });
export const blogIdSchema = z.string().trim().min(1);
