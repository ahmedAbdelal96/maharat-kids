import "server-only";

import { failure, success, type Result } from "@/core/result";
import { getCurrentUser } from "@/modules/auth/server/queries";
import { AppError } from "@/core/errors";
import { CartService } from "../domain/service";
import { PrismaCartRepository } from "../infrastructure/repository";
import type { CartContext, CartMergeResult } from "../types";
import { clearGuestToken, createGuestToken, getGuestToken, hashGuestToken, setGuestToken } from "../providers/guest-token";
import { resolveMarket } from "@/modules/market/server/resolver";

function service() {
  return new CartService(new PrismaCartRepository());
}

export async function resolveShoppingCartContext(options: { createGuest?: boolean } = {}): Promise<Result<CartContext | null, AppError>> {
  let market;
  try { market = (await resolveMarket()).market; } catch { return failure(new AppError("MARKET_UNRESOLVED", "This storefront market is unavailable.")); }
  const current = await getCurrentUser();
  if (!current.success) return failure(current.error);
  if (current.data?.user.type === "CUSTOMER") return success({ kind: "customer", customerId: current.data.user.id, market });

  let token = await getGuestToken();
  if (!token && options.createGuest) {
    token = createGuestToken();
    await setGuestToken(token);
  }
  return success(token ? { kind: "guest", guestTokenHash: hashGuestToken(token), market } : null);
}

export async function mergeGuestCartForCustomer(customerId: string): Promise<Result<CartMergeResult | null, AppError>> {
  const token = await getGuestToken();
  if (!token) return success(null);
  let market;
  try { market = (await resolveMarket()).market; } catch { return failure(new AppError("MARKET_UNRESOLVED", "This storefront market is unavailable.")); }
  const result = await service().mergeGuestCart(customerId, hashGuestToken(token), market);
  if (result.success) await clearGuestToken();
  return result;
}
