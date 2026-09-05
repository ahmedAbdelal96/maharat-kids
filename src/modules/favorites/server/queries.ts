import "server-only";

import { loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { getCurrentUser, requireCustomer } from "@/modules/auth/server/queries";
import { createFavoritesService } from "./service";

export async function getCustomerFavorites() {
  const actor = await requireCustomer();
  return actor.success ? createFavoritesService().getFavorites(actor.data.user.id) : actor;
}

export async function getCustomerFavoriteProductIds() {
  const actor = await requireCustomer();
  return actor.success ? createFavoritesService().getProductIds(actor.data.user.id) : actor;
}

export async function getCurrentCustomerFavoriteIds(): Promise<string[]> {
  const actor = await getCurrentUser();
  if (!actor.success || !actor.data || actor.data.user.type !== "CUSTOMER") return [];
  const result = await createFavoritesService().getProductIds(actor.data.user.id);
  return result.success ? result.data : [];
}

export async function getCurrentCustomerFavoriteCount(): Promise<number | null> {
  const actor = await getCurrentUser();
  if (!actor.success || !actor.data || actor.data.user.type !== "CUSTOMER") return null;
  const result = await createFavoritesService().getProductIds(actor.data.user.id);
  return result.success ? result.data.length : 0;
}

export async function getStorefrontFavoriteSummary(): Promise<{ count: number | null; href: string | null }> {
  const actor = await getCurrentUser();
  if (!actor.success || !actor.data) {
    return { count: null, href: loginPathForReturnTo("/account/favorites") };
  }
  if (actor.data.user.type !== "CUSTOMER") return { count: null, href: null };
  const result = await createFavoritesService().getProductIds(actor.data.user.id);
  return { count: result.success ? result.data.length : 0, href: "/account/favorites" };
}
