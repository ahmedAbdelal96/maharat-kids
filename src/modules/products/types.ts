export type ProductId = string & { readonly __brand: "ProductId"; };

export type ProductRatingSummary = {
  average: number;
  count: number;
};

export type Product = {
  id: ProductId;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  marketPrices: { saudiPrice: string; saudiCompareAtPrice: string | null; egyptPrice: string; egyptCompareAtPrice: string | null };
  status: ProductStatus;
  fulfillmentType: "PHYSICAL" | "DIGITAL";
  isFeatured: boolean;
  categoryId: string | null;
  primaryCategoryId: string | null;
  categoryIds: string[];
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  productLanguage: "ARABIC" | "ENGLISH" | "BILINGUAL" | "LANGUAGE_INDEPENDENT";
  difficultyLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  skillIds: string[];
  learningObjectiveIds: string[];
  productTypeIds: string[];
  useContextIds: string[];
  ageGroupIds: string[];
  materials: string | null;
  numberOfPieces: number | null;
  dimensions: string | null;
  recommendedPlayers: string | null;
  supervisionRequired: boolean;
  safetyNotes: string | null;
  usageInstructions: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  trackInventory: boolean;
  stockQuantity: number;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  ratingSummary?: ProductRatingSummary;
  options?: ProductOption[];
  variants?: ProductVariant[];
  digitalAssets?: DigitalAssetSummary[];
};

export type DigitalAssetSummary = { id: string; variantId: string | null; displayNameAr: string; displayNameEn: string; mimeType: string; sizeBytes: number; version: number; status: "ACTIVE" | "RETIRED" | "BLOCKED" };

export type ProductOptionValue = { id: string; optionId: string; labelAr: string; labelEn: string; sortOrder: number; isActive: boolean; swatch: string | null; imageMediaId: string | null };
export type ProductOption = { id: string; productId: string; nameAr: string; nameEn: string; sortOrder: number; isActive: boolean; values: ProductOptionValue[] };
export type ProductVariantOption = { optionId: string; optionNameAr: string; optionNameEn: string; valueId: string; labelAr: string; labelEn: string };
export type ProductVariant = { id: string; productId: string; sku: string; barcode: string | null; active: boolean; isDefault: boolean; sortOrder: number; trackInventory: boolean; stockQuantity: number; combinationKey: string; marketPrices: { market: "SAUDI_ARABIA" | "EGYPT"; price: string; compareAtPrice: string | null }[]; options: ProductVariantOption[]; imageIds: string[] };

export type CreateProductInput = {
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  sku?: string | null;
  price?: string;
  compareAtPrice?: string | null;
  marketPrices: { saudiPrice: string; saudiCompareAtPrice?: string | null; egyptPrice: string; egyptCompareAtPrice?: string | null };
  status?: ProductStatus;
  fulfillmentType?: "PHYSICAL" | "DIGITAL";
  isFeatured?: boolean;
  categoryId?: string | null;
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  minAgeMonths?: number | null;
  maxAgeMonths?: number | null;
  productLanguage?: "ARABIC" | "ENGLISH" | "BILINGUAL" | "LANGUAGE_INDEPENDENT";
  difficultyLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  skillIds?: string[];
  learningObjectiveIds?: string[];
  productTypeIds?: string[];
  useContextIds?: string[];
  ageGroupIds?: string[];
  materials?: string | null;
  numberOfPieces?: number | null;
  dimensions?: string | null;
  recommendedPlayers?: string | null;
  supervisionRequired?: boolean;
  safetyNotes?: string | null;
  usageInstructions?: string | null;
  trackInventory?: boolean;
  stockQuantity?: number;
  images?: ProductImageInput[];
};

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ProductImage = { id: string; mediaId: string | null; url: string; altText: string | null; sortOrder: number; isPrimary: boolean };
export type ProductImageInput = { mediaId: string; altText?: string | null; sortOrder?: number; isPrimary?: boolean };

/** One storefront authority for a product's primary image. */
export function getPrimaryProductImage(images: ProductImage[] | undefined) {
  if (!images?.length) return undefined;
  return images.find((image) => image.isPrimary) ?? [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}
export type UpdateProductInput = CreateProductInput & { id: string };
export type ProductQuery = { search?: string; categorySlug?: string; categoryId?: string; ageMonths?: number; skillIds?: string[]; productTypeIds?: string[]; language?: "ARABIC" | "ENGLISH" | "BILINGUAL" | "LANGUAGE_INDEPENDENT"; status?: ProductStatus; featured?: boolean; minPrice?: string; maxPrice?: string; inStock?: boolean; page?: number; pageSize?: number };
export type ProductPage = { items: Product[]; total: number; page: number; pageSize: number; totalPages: number };
