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
  status: ProductStatus;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  trackInventory: boolean;
  stockQuantity: number;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  ratingSummary?: ProductRatingSummary;
};

export type CreateProductInput = {
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  sku?: string | null;
  price: string;
  compareAtPrice?: string | null;
  status?: ProductStatus;
  isFeatured?: boolean;
  categoryId?: string | null;
  trackInventory?: boolean;
  stockQuantity?: number;
  images?: ProductImageInput[];
};

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ProductImage = { id: string; mediaId: string | null; url: string; altText: string | null; sortOrder: number; isPrimary: boolean };
export type ProductImageInput = { mediaId: string; altText?: string | null; sortOrder?: number; isPrimary?: boolean };
export type UpdateProductInput = CreateProductInput & { id: string };
export type ProductQuery = { search?: string; categorySlug?: string; categoryId?: string; status?: ProductStatus; featured?: boolean; minPrice?: string; maxPrice?: string; inStock?: boolean; page?: number; pageSize?: number };
export type ProductPage = { items: Product[]; total: number; page: number; pageSize: number; totalPages: number };
