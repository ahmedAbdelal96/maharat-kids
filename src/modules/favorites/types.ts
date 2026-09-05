import type { Product, ProductId } from "@/modules/products/types";

export type Favorite = {
  id: string;
  userId: string;
  productId: ProductId;
  createdAt: string;
};

export type FavoriteProduct = {
  favoriteId: string;
  createdAt: string;
  product: Product;
  isAvailable: boolean;
};
