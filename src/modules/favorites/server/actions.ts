"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireCustomer } from "@/modules/auth/server/queries";
import { favoriteProductSchema } from "../schema";
import { createFavoritesService } from "./service";

function refreshFavorites() {
  revalidatePath("/account/favorites");
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "layout");
  revalidatePath("/", "layout");
}

export async function addFavorite(input: unknown) {
  const parsed = favoriteProductSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid product."));
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  const result = await createFavoritesService().add(actor.data.user.id, parsed.data.productId);
  if (result.success) refreshFavorites();
  return result;
}

export async function removeFavorite(input: unknown) {
  const parsed = favoriteProductSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid product."));
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  const result = await createFavoritesService().remove(actor.data.user.id, parsed.data.productId);
  if (result.success) refreshFavorites();
  return result;
}
