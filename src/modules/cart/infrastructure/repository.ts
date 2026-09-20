import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { Cart, CartContext, CartItem, CartMergeResult } from "../types";
import { canPurchaseQuantity, isInventoryAvailable } from "@/modules/inventory/domain/inventory";
import { evaluatePromotions } from "@/modules/promotions/domain/evaluator";
import { evaluateCoupon } from "@/modules/coupons/domain/evaluator";
import { findCouponForPricing } from "@/modules/coupons/infrastructure/repository";
import { getMarketConfiguration, type Market } from "@/modules/market/domain/market";

function money(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

type Database = PrismaClient | Prisma.TransactionClient;
type CartRecord = Prisma.CartGetPayload<{ include: { items: true; coupon: true } }>;

type ProductAvailability = {
  status: string;
  trackInventory: boolean;
  stockQuantity: number;
  variants?: Array<{ id: string; active: boolean; trackInventory: boolean; stockQuantity: number; sku: string; optionValues: Array<{ optionValue: { labelAr: string; labelEn: string; option: { nameAr: string; nameEn: string } } }> }>;
};

async function toCart(record: CartRecord, products: Map<string, ProductAvailability>, warnings: string[] = [], db: Database = getPrismaClient(), customerId?: string): Promise<Cart> {
  const items: CartItem[] = record.items.map((item) => {
    const product = products.get(item.productId);
    const variant = item.variantId ? product?.variants?.find((entry) => entry.id === item.variantId) : undefined;
    const variantLabel = variant?.optionValues.map((entry) => `${entry.optionValue.option.nameAr}: ${entry.optionValue.labelAr}`).join(" / ");
    return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: variantLabel ? `${item.name} — ${variantLabel}` : item.name,
    imageUrl: item.imageUrl,
    unitPrice: money(item.unitPrice),
    quantity: item.quantity,
    lineTotal: money(item.unitPrice.mul(item.quantity)),
    availableStock: variant ? (variant.trackInventory ? variant.stockQuantity : null) : product?.trackInventory ? product.stockQuantity : null,
    isAvailable: product?.status === "ACTIVE" && (variant ? variant.active && isInventoryAvailable(variant) : isInventoryAvailable(product ?? { trackInventory: true, stockQuantity: 0 })),
  };
  });
  const activeItems = items.filter((item) => item.isAvailable);
  const promoEval = await evaluatePromotions({ market: record.market ?? "SAUDI_ARABIA", items: activeItems.map((item) => ({ productId: item.productId, unitPrice: item.unitPrice, quantity: item.quantity })), tx: db });
  const originalSubtotal = items.reduce((total, item) => total.add(new Prisma.Decimal(item.lineTotal)), new Prisma.Decimal(0));
  let discountAmount = new Prisma.Decimal(promoEval.discountAmount);
  let appliedPromotion = promoEval.appliedPromotion;
  let giftItems = promoEval.giftItems;
  let couponDiscount = new Prisma.Decimal(0);
  let couponMessage: string | null = null;
  let appliedCoupon: Cart["coupon"] = null;
  if (record.coupon) {
    const coupon = await findCouponForPricing(db, record.coupon.id, record.market ?? "SAUDI_ARABIA", customerId);
    if (coupon) {
      const couponEval = evaluateCoupon({ coupon, subtotal: originalSubtotal, promotionDiscount: coupon.canCombineWithPromotions ? discountAmount : 0, totalRedeemed: coupon.totalRedeemed, customerRedeemed: coupon.customerRedeemed });
      if (couponEval.valid) {
        const couponAmount = new Prisma.Decimal(couponEval.discountAmount);
        const promotionWins = !coupon.canCombineWithPromotions && discountAmount.gt(couponAmount);
        const chosen = promotionWins ? { ...couponEval, applied: false, discountAmount: "0.00", reason: "This offer gives you a better discount than your coupon." } : couponEval;
        if (!promotionWins && !coupon.canCombineWithPromotions) { discountAmount = new Prisma.Decimal(0); appliedPromotion = null; giftItems = []; }
        couponDiscount = new Prisma.Decimal(chosen.discountAmount);
        couponMessage = chosen.reason;
        appliedCoupon = { code: coupon.code, name: coupon.name, type: coupon.type, discountAmount: chosen.discountAmount };
      } else couponMessage = couponEval.reason;
    } else couponMessage = "This coupon code is not valid.";
  }
  const finalSubtotal = originalSubtotal.sub(discountAmount).sub(couponDiscount).gt(0) ? originalSubtotal.sub(discountAmount).sub(couponDiscount) : new Prisma.Decimal(0);
  return {
    id: record.id,
    market: record.market as Market | null,
    currency: record.market ? getMarketConfiguration(record.market as Market).currency : null,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    originalSubtotal: originalSubtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    subtotal: finalSubtotal.toFixed(2),
    appliedPromotion,
    giftItems,
    progressHint: promoEval.progressHint,
    warnings,
    coupon: appliedCoupon,
    couponDiscount: couponDiscount.toFixed(2),
    couponMessage,
  };
}

export function emptyCart(): Cart {
  return { id: "empty-cart", market: null, currency: null, items: [], itemCount: 0, originalSubtotal: "0.00", discountAmount: "0.00", subtotal: "0.00", appliedPromotion: null, giftItems: [], progressHint: null, warnings: [], coupon: null, couponDiscount: "0.00", couponMessage: null };
}

export interface CartRepository {
  findOrCreate(context: CartContext): Promise<Cart>;
  addProduct(context: CartContext, productId: string, quantity: number, variantId?: string | null): Promise<Cart>;
  revalidate(context: CartContext): Promise<Cart>;
  updateQuantity(context: CartContext, cartItemId: string, quantity: number): Promise<Cart>;
  removeItem(context: CartContext, cartItemId: string): Promise<Cart>;
  clear(context: CartContext): Promise<Cart>;
  applyCoupon(context: CartContext, code: string): Promise<Cart>;
  removeCoupon(context: CartContext): Promise<Cart>;
  mergeGuestCart(customerId: string, guestTokenHash: string, market: Market): Promise<CartMergeResult>;
}

export class PrismaCartRepository implements CartRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private async findRecord(db: Database, context: CartContext) {
    return context.kind === "customer"
      ? db.cart.findUnique({ where: { customerId: context.customerId }, include: { coupon: true, items: { orderBy: { createdAt: "asc" } } } })
      : db.cart.findUnique({ where: { guestTokenHash: context.guestTokenHash }, include: { coupon: true, items: { orderBy: { createdAt: "asc" } } } });
  }

  private async ensureRecord(db: Database, context: CartContext) {
    const where = context.kind === "customer" ? { customerId: context.customerId } : { guestTokenHash: context.guestTokenHash };
    const create = context.kind === "customer" ? { customerId: context.customerId, market: context.market } : { guestTokenHash: context.guestTokenHash, market: context.market };
    const existing = await db.cart.findUnique({ where, select: { id: true, market: true } });
    // A market change rebases the cart. Cart lines are repriced on the next revalidation.
    if (existing && existing.market !== context.market) await db.cart.update({ where: { id: existing.id }, data: { market: context.market, couponId: null } });
    return db.cart.upsert({ where, update: {}, create, include: { coupon: true, items: { orderBy: { createdAt: "asc" } } } });
  }

  private async findCart(context: CartContext, warnings: string[] = []): Promise<Cart> {
    const record = context.kind === "customer" ? await this.ensureRecord(this.db, context) : await this.findRecord(this.db, context);
    if (!record) return emptyCart();
    const products = await this.db.product.findMany({ where: { id: { in: record.items.map((item) => item.productId) } }, select: { id: true, status: true, trackInventory: true, stockQuantity: true, variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } } } } } });
    return toCart(record, new Map(products.map((product) => [product.id, product])), warnings, this.db, context.kind === "customer" ? context.customerId : undefined);
  }

  async findOrCreate(context: CartContext): Promise<Cart> { return this.findCart(context); }

  async addProduct(context: CartContext, productId: string, quantity: number, variantId?: string | null): Promise<Cart> {
    await this.db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, marketPrices: { where: { market: context.market } }, variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, marketPrices: { where: { market: context.market } } } } } });
      if (!product || product.status !== "ACTIVE") throw new Error("PRODUCT_UNAVAILABLE");
      const variant = variantId ? product.variants.find((candidate) => candidate.id === variantId && candidate.active) : undefined;
      if (product.variants.length > 0 && (!variant || variant.optionValues.some((entry) => !entry.optionValue.isActive || !entry.optionValue.option.isActive))) throw new Error("VARIANT_REQUIRED");
      const cart = await this.ensureRecord(tx, context);
      const existing = await tx.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId: variant?.id ?? null } });
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (variant ? (variant.trackInventory && variant.stockQuantity < nextQuantity) : !canPurchaseQuantity(product, nextQuantity)) throw new Error("INSUFFICIENT_STOCK");
      const price = variant?.marketPrices[0]?.price ?? product.marketPrices[0]?.price;
      if (!price) throw new Error("PRODUCT_UNAVAILABLE");
      const variantOptions = variant ? variant.optionValues.map((item) => ({ optionId: item.optionValue.optionId, optionNameAr: item.optionValue.option.nameAr, optionNameEn: item.optionValue.option.nameEn, valueId: item.optionValue.id, labelAr: item.optionValue.labelAr, labelEn: item.optionValue.labelEn })) : null;
      const itemData = { quantity: nextQuantity, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, variantSku: variant?.sku ?? null, variantOptions: variantOptions ? variantOptions as Prisma.InputJsonValue : Prisma.JsonNull };
      if (existing) await tx.cartItem.update({ where: { id: existing.id }, data: itemData });
      else await tx.cartItem.create({ data: { cartId: cart.id, productId, variantId: variant?.id ?? null, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, quantity, variantSku: variant?.sku ?? null, variantOptions: variantOptions ? variantOptions as Prisma.InputJsonValue : Prisma.JsonNull } });
    });
    return this.findCart(context);
  }

  async revalidate(context: CartContext): Promise<Cart> {
    const warnings: string[] = [];
    await this.db.$transaction(async (tx) => {
      const cart = await this.findRecord(tx, context);
      if (!cart) return;
      const products = await tx.product.findMany({ where: { id: { in: cart.items.map((item) => item.productId) } }, include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, marketPrices: { where: { market: context.market } }, variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, marketPrices: { where: { market: context.market } } } } } });
      const byId = new Map(products.map((product) => [product.id, product]));
      for (const item of cart.items) {
        const product = byId.get(item.productId);
        const variant = item.variantId ? product?.variants.find((entry) => entry.id === item.variantId && entry.active) : undefined;
        const price = variant?.marketPrices[0]?.price ?? product?.marketPrices[0]?.price;
        if (!product || product.status !== "ACTIVE" || !price || (product.variants.length > 0 && !variant)) { await tx.cartItem.delete({ where: { id: item.id } }); warnings.push(`${item.name} was removed because it is no longer available in this market.`); continue; }
        const nextQuantity = variant ? (variant.trackInventory ? Math.min(item.quantity, variant.stockQuantity) : item.quantity) : product.trackInventory ? Math.min(item.quantity, product.stockQuantity) : item.quantity;
        if (nextQuantity < 1) { await tx.cartItem.delete({ where: { id: item.id } }); warnings.push(`${item.name} was removed because it is out of stock.`); continue; }
        if (nextQuantity !== item.quantity) warnings.push(`${product.name} quantity was adjusted to ${nextQuantity} based on current stock.`);
        await tx.cartItem.update({ where: { id: item.id }, data: { quantity: nextQuantity, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, variantSku: variant?.sku ?? null, variantOptions: variant ? variant.optionValues.map((entry) => ({ optionId: entry.optionValue.optionId, optionNameAr: entry.optionValue.option.nameAr, optionNameEn: entry.optionValue.option.nameEn, valueId: entry.optionValue.id, labelAr: entry.optionValue.labelAr, labelEn: entry.optionValue.labelEn })) as Prisma.InputJsonValue : Prisma.JsonNull } });
      }
    });
    const cart = await this.findCart(context, warnings);
    if (!cart.coupon && cart.couponMessage) {
      const record = await this.findRecord(this.db, context);
      if (record?.couponId) {
        await this.db.cart.update({ where: { id: record.id }, data: { couponId: null } });
      }
    }
    return cart;
  }

  async updateQuantity(context: CartContext, cartItemId: string, quantity: number): Promise<Cart> {
    await this.db.$transaction(async (tx) => {
      const cart = await this.findRecord(tx, context);
      if (!cart) return;
      const item = await tx.cartItem.findFirst({ where: { id: cartItemId, cartId: cart.id } });
      if (!item) throw new Error("CART_ITEM_NOT_FOUND");
      const product = await tx.product.findUnique({ where: { id: item.productId }, include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, marketPrices: { where: { market: context.market } }, variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, marketPrices: { where: { market: context.market } } } } } });
      const variant = item.variantId ? product?.variants.find((entry) => entry.id === item.variantId && entry.active) : undefined;
      const price = variant?.marketPrices[0]?.price ?? product?.marketPrices[0]?.price;
      if (!product || product.status !== "ACTIVE" || !price || (product.variants.length > 0 && !variant)) throw new Error("PRODUCT_UNAVAILABLE");
      if (variant ? (variant.trackInventory && variant.stockQuantity < quantity) : !canPurchaseQuantity(product, quantity)) throw new Error("INSUFFICIENT_STOCK");
      await tx.cartItem.update({ where: { id: item.id }, data: { quantity, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, variantSku: variant?.sku ?? null, variantOptions: variant ? variant.optionValues.map((entry) => ({ optionId: entry.optionValue.optionId, optionNameAr: entry.optionValue.option.nameAr, optionNameEn: entry.optionValue.option.nameEn, valueId: entry.optionValue.id, labelAr: entry.optionValue.labelAr, labelEn: entry.optionValue.labelEn })) as Prisma.InputJsonValue : Prisma.JsonNull } });
    });
    return this.findCart(context);
  }

  async removeItem(context: CartContext, cartItemId: string): Promise<Cart> {
    const cart = await this.findRecord(this.db, context);
    if (!cart) return this.findCart(context);
    const deleted = await this.db.cartItem.deleteMany({ where: { id: cartItemId, cartId: cart.id } });
    if (deleted.count === 0) throw new Error("CART_ITEM_NOT_FOUND");
    return this.findCart(context);
  }

  async clear(context: CartContext): Promise<Cart> {
    const cart = await this.findRecord(this.db, context);
    if (cart) await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.findCart(context);
  }

  async applyCoupon(context: CartContext, code: string): Promise<Cart> {
    const cart = await this.findRecord(this.db, context);
    if (!cart || cart.items.length === 0) throw new Error("CART_EMPTY");
    const coupon = await this.db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon) throw new Error("COUPON_INVALID");
    await this.db.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    const updated = await this.findCart(context);
    if (!updated.coupon && updated.couponMessage) {
      await this.db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
      throw new Error(`COUPON_NOT_APPLICABLE:${updated.couponMessage}`);
    }
    return updated;
  }

  async removeCoupon(context: CartContext): Promise<Cart> {
    const cart = await this.findRecord(this.db, context);
    if (cart) await this.db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return this.findCart(context);
  }

  async mergeGuestCart(customerId: string, guestTokenHash: string, market: Market): Promise<CartMergeResult> {
    const warnings: string[] = [];
    let merged = false;
    await this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "Cart" WHERE "guestTokenHash" = ${guestTokenHash} FOR UPDATE`);
      if (!locked[0]) return;
      const guest = await tx.cart.findUnique({ where: { guestTokenHash }, include: { coupon: true, items: { orderBy: { createdAt: "asc" } } } });
      if (!guest) return;
      merged = true;
      const customer = await tx.cart.upsert({ where: { customerId }, update: { market, couponId: null }, create: { customerId, market }, select: { id: true } });
      const productIds = [...new Set(guest.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, marketPrices: { where: { market } }, variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, marketPrices: { where: { market } } } } } });
      const byId = new Map(products.map((product) => [product.id, product]));
      for (const guestItem of guest.items) {
        const product = byId.get(guestItem.productId);
        const variant = guestItem.variantId ? product?.variants.find((entry) => entry.id === guestItem.variantId && entry.active) : undefined;
        const price = variant?.marketPrices[0]?.price ?? product?.marketPrices[0]?.price;
        if (!product || product.status !== "ACTIVE" || !price || (product.variants.length > 0 && !variant)) { warnings.push(`${guestItem.name} was removed because it is no longer available in this market.`); continue; }
        const existing = await tx.cartItem.findFirst({ where: { cartId: customer.id, productId: guestItem.productId, variantId: guestItem.variantId } });
        const desiredQuantity = (existing?.quantity ?? 0) + guestItem.quantity;
        const finalQuantity = variant ? (variant.trackInventory ? Math.min(desiredQuantity, variant.stockQuantity) : Math.min(desiredQuantity, 99)) : product.trackInventory ? Math.min(desiredQuantity, product.stockQuantity) : Math.min(desiredQuantity, 99);
        if (finalQuantity < 1) { warnings.push(`${product.name} was removed because it is out of stock.`); continue; }
        if (finalQuantity !== desiredQuantity) warnings.push(`${product.name} quantity was adjusted to ${finalQuantity} based on current stock.`);
        const variantOptions = variant ? variant.optionValues.map((entry) => ({ optionId: entry.optionValue.optionId, optionNameAr: entry.optionValue.option.nameAr, optionNameEn: entry.optionValue.option.nameEn, valueId: entry.optionValue.id, labelAr: entry.optionValue.labelAr, labelEn: entry.optionValue.labelEn })) : null;
        const itemData = { quantity: finalQuantity, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, variantSku: variant?.sku ?? null, variantOptions: variantOptions ? variantOptions as Prisma.InputJsonValue : Prisma.JsonNull };
        if (existing) await tx.cartItem.update({ where: { id: existing.id }, data: itemData });
        else await tx.cartItem.create({ data: { cartId: customer.id, productId: product.id, variantId: variant?.id ?? null, name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: price, quantity: finalQuantity, variantSku: variant?.sku ?? null, variantOptions: variantOptions ? variantOptions as Prisma.InputJsonValue : Prisma.JsonNull } });
      }
      if (guest.couponId) await tx.cart.update({ where: { id: customer.id }, data: { couponId: guest.couponId } });
      await tx.cart.delete({ where: { id: guest.id } });
    });
    const cart = await this.revalidate({ kind: "customer", customerId, market });
    return { cart: { ...cart, warnings: [...warnings, ...cart.warnings] }, warnings: [...warnings, ...cart.warnings], merged };
  }
}
