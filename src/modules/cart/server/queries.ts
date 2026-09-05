import "server-only";

import { failure, success } from "@/core/result";
import { CartService } from "../domain/service";
import { emptyCart, PrismaCartRepository } from "../infrastructure/repository";
import { resolveShoppingCartContext } from "./context";

function service() { return new CartService(new PrismaCartRepository()); }

export async function getCurrentCart() {
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  return context.data ? service().getCurrentCart(context.data) : success(emptyCart());
}

export async function revalidateCurrentCart() {
  const context = await resolveShoppingCartContext();
  if (!context.success) return failure(context.error);
  return context.data ? service().revalidate(context.data) : success(emptyCart());
}

export async function getStoreHeaderCart() {
  const context = await resolveShoppingCartContext();
  if (!context.success) return null;
  return context.data ? service().getCurrentCart(context.data) : success(emptyCart());
}
