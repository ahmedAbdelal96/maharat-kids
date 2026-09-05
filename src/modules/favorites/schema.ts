import { z } from "zod";

export const favoriteProductSchema = z.object({
  productId: z.string().min(1, "Please select a valid product."),
});

export type FavoriteProductInput = z.infer<typeof favoriteProductSchema>;
