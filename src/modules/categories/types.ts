export type CategoryId = string & { readonly __brand: "CategoryId"; };

export type Category = {
  id: CategoryId;
  name: string;
  slug: string;
  parentId: CategoryId | null;
  description: string | null;
  imageMediaId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  showInNavigation: boolean;
  sortOrder: number;
  productCount: number;
  childCount: number;
  children: Category[];
};

export type CreateCategoryInput = {
  name: string;
  parentId?: string | null;
  description?: string | null;
  imageMediaId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  showInNavigation?: boolean;
  slug?: string;
};

export type UpdateCategoryInput = CreateCategoryInput & { id: string };
