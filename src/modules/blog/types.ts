export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export type BlogCategory = {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export type BlogPost = {
  id: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string | null;
  excerptEn: string | null;
  contentAr: string;
  contentEn: string;
  slug: string;
  status: BlogPostStatus;
  coverMediaId: string | null;
  coverUrl: string | null;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: BlogCategory | null;
  productIds: string[];
  storeCategoryIds: string[];
};

export type BlogPostPage = { items: BlogPost[]; total: number; page: number; pageSize: number; totalPages: number };

export type BlogPostInput = {
  titleAr: string; titleEn: string; excerptAr?: string | null; excerptEn?: string | null;
  contentAr: string; contentEn: string; slug?: string; status?: BlogPostStatus;
  coverMediaId?: string | null; categoryId?: string | null;
  seoTitleAr?: string | null; seoTitleEn?: string | null; seoDescriptionAr?: string | null; seoDescriptionEn?: string | null;
  productIds?: string[]; storeCategoryIds?: string[];
};

export type BlogCategoryInput = { nameAr: string; nameEn: string; slug?: string; isActive?: boolean; sortOrder?: number };
