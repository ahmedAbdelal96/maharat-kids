import type { ProductLanguage, DifficultyLevel } from "@prisma/client";

export type CatalogTaxonomyKind = "skill" | "objective" | "productType" | "useContext" | "ageGroup";
export type TaxonomyInput = { slug: string; nameAr: string; nameEn: string; isActive?: boolean; sortOrder?: number; descriptionAr?: string | null; descriptionEn?: string | null; minAgeMonths?: number; maxAgeMonths?: number };
export type ProductEducationInput = {
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  minAgeMonths?: number | null;
  maxAgeMonths?: number | null;
  ageGroupIds?: string[];
  skillIds?: string[];
  learningObjectiveIds?: string[];
  productTypeIds?: string[];
  useContextIds?: string[];
  productLanguage?: ProductLanguage;
  difficultyLevel?: DifficultyLevel | null;
  materials?: string | null;
  numberOfPieces?: number | null;
  dimensions?: string | null;
  recommendedPlayers?: string | null;
  supervisionRequired?: boolean;
  safetyNotes?: string | null;
  usageInstructions?: string | null;
};
