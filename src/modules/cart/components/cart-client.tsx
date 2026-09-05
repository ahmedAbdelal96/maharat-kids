"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Gift, Minus, Plus, ShoppingBag, Sparkles, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ecommerce/product-image";
import { formatMoney } from "@/lib/formatters";
import { applyCouponToCart, removeCartItem, removeCouponFromCart, updateCartItemQuantity } from "../server/actions";
import type { Cart } from "../types";

export function CartClient({ initialCart, currency }: { initialCart: Cart; currency: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [cart, setCart] = useState(initialCart);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  async function setQuantity(cartItemId: string, quantity: number) {
    const item = cart.items.find((current) => current.id === cartItemId);
    if (item?.availableStock !== null && item && quantity > item.availableStock) {
      setError(`Only ${item.availableStock} ${item.name} available.`);
      return;
    }
    setBusyId(cartItemId);
    setError("");
    const result = await updateCartItemQuantity({ cartItemId, quantity });
    if (!result.success) setError(result.error.message);
    else setCart(result.data);
    router.refresh();
    setBusyId(null);
  }

  async function remove(cartItemId: string) {
    setBusyId(cartItemId);
    setError("");
    const result = await removeCartItem({ cartItemId });
    if (!result.success) setError(result.error.message);
    else setCart(result.data);
    router.refresh();
    setBusyId(null);
  }

  async function applyCoupon() {
    setCouponBusy(true);
    setError("");
    const result = await applyCouponToCart({ code: couponCode });
    if (!result.success) setError(result.error.message);
    else { setCart(result.data); setCouponCode(""); }
    router.refresh();
    setCouponBusy(false);
  }

  async function removeCoupon() {
    setCouponBusy(true);
    const result = await removeCouponFromCart();
    if (!result.success) setError(result.error.message);
    else setCart(result.data);
    router.refresh();
    setCouponBusy(false);
  }

  const warningNotice = cart.warnings.length > 0 && <div role="status" className="mb-4 space-y-1 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3 py-2 text-left text-xs text-[var(--text-primary)]">{cart.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>;

  if (cart.items.length === 0) {
    return (
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] px-6 py-16 text-center">
        {warningNotice}<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><ShoppingBag className="h-8 w-8" /></div>
        <h2 className="mt-5 text-xl font-bold">Your cart is empty</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">Browse the catalog and add products you love to start shopping.</p>
        <Link href="/products"><Button className="mt-6 gap-2">Continue Shopping <ArrowRight className="h-4 w-4" /></Button></Link>
      </motion.div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {warningNotice}
        {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4">
          {cart.coupon ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Tag className="h-4 w-4 text-[var(--primary)]" />
              <div className="min-w-0 flex-1"><p className="font-bold">{cart.coupon.code}</p><p className="text-xs text-[var(--text-secondary)]">{Number(cart.couponDiscount) > 0 ? `${cart.coupon.name} applied.` : cart.couponMessage ?? "Coupon selected."}</p></div>
              {Number(cart.couponDiscount) > 0 && <Badge variant="success" size="sm">Save {formatMoney(cart.couponDiscount, currency)}</Badge>}
              <Button type="button" variant="ghost" size="sm" disabled={couponBusy} onClick={removeCoupon}>Remove</Button>
            </div>
          ) : (
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void applyCoupon(); }}>
              <label htmlFor="cart-coupon" className="sr-only">Coupon code</label>
              <input id="cart-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Have a coupon?" className="h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm uppercase outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--ring)]" />
              <Button type="submit" size="sm" isLoading={couponBusy} disabled={!couponCode.trim()}>Apply</Button>
            </form>
          )}
        </div>

        {cart.appliedPromotion && (
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/20 bg-[var(--primary-soft)]/40 p-3.5 text-xs text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <div className="flex-1">
              <span className="font-bold text-[var(--primary)]">{cart.appliedPromotion.promotionName} Applied: </span>
              <span>{cart.appliedPromotion.benefitDescription}</span>
            </div>
            {Number(cart.discountAmount) > 0 && (
              <Badge variant="accent" size="sm" className="font-bold">
                Save {formatMoney(cart.discountAmount, currency)}
              </Badge>
            )}
          </div>
        )}

        {cart.progressHint && !cart.appliedPromotion && (
          <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 text-xs text-[var(--text-secondary)]">
            <Tag className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span>{cart.progressHint}</span>
          </div>
        )}

        <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)]">
          <AnimatePresence initial={false} mode="popLayout">
            {cart.items.map((item) => {
              const atStockLimit = item.availableStock !== null && item.quantity >= item.availableStock;
              return (
                <motion.div key={item.id} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" /></div>
                    <div className="min-w-0"><p className="truncate font-semibold text-[var(--text-primary)]">{item.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatMoney(item.unitPrice, currency)} each</p>{!item.isAvailable && <p className="mt-2 text-xs font-semibold text-[var(--destructive)]">This product is no longer available.</p>}{item.availableStock !== null && <p className="mt-2 text-xs text-[var(--text-muted)]">{item.availableStock} available</p>}{atStockLimit && <p className="mt-1 text-[10px] font-semibold text-[var(--warning)]">Maximum available quantity reached.</p>}</div>
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end"><div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)]"><Button variant="ghost" size="icon" aria-label={`Decrease ${item.name}`} disabled={busyId === item.id || item.quantity <= 1 || !item.isAvailable} onClick={() => setQuantity(item.id, item.quantity - 1)}><Minus className="h-3.5 w-3.5" /></Button><span className="w-8 text-center text-xs font-bold">{item.quantity}</span><Button variant="ghost" size="icon" aria-label={`Increase ${item.name}`} disabled={busyId === item.id || atStockLimit || !item.isAvailable} onClick={() => setQuantity(item.id, item.quantity + 1)}><Plus className="h-3.5 w-3.5" /></Button></div><span className="min-w-24 text-right text-sm font-bold">{formatMoney(item.lineTotal, currency)}</span><Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} disabled={busyId === item.id} onClick={() => remove(item.id)}><Trash2 className="h-4 w-4 text-[var(--destructive)]" /></Button></div>
                </motion.div>
              );
            })}

            {cart.giftItems.map((gift) => (
              <motion.div key={`gift-${gift.productId}`} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)]">
                    <ProductImage src={gift.imageUrl ?? undefined} alt={gift.name} aspectRatio="square" />
                    <div className="absolute top-1 left-1">
                      <Badge variant="accent" size="sm" className="text-[10px] uppercase font-bold tracking-wider">
                        Gift
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-[var(--text-primary)]">{gift.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Free gift with {gift.promotionName}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--success)]">
                      <Gift className="h-3.5 w-3.5" /> FREE (Was {formatMoney(gift.originalPrice, currency)})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-5">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Qty: {gift.quantity}</span>
                  <span className="min-w-24 text-right text-sm font-extrabold text-[var(--success)]">FREE</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Link href="/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">← Continue Shopping</Link>
      </div>
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <h2 className="border-b border-[var(--border)] pb-3 text-lg font-bold">Order Summary</h2>
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Subtotal</span>
            <span className="font-bold">{formatMoney(cart.originalSubtotal, currency)}</span>
          </div>
          {Number(cart.discountAmount) > 0 && (
            <div className="flex justify-between text-xs text-[var(--primary)] font-semibold">
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                {cart.appliedPromotion?.promotionName || "Promotional Offer"}
              </span>
              <span>-{formatMoney(cart.discountAmount, currency)}</span>
            </div>
          )}
          {Number(cart.couponDiscount) > 0 && cart.coupon && (
            <div className="flex justify-between text-xs font-semibold text-[var(--accent)]"><span>{cart.coupon.code}</span><span>-{formatMoney(cart.couponDiscount, currency)}</span></div>
          )}
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Shipping</span>
            <span>{formatMoney("0", currency)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-4 text-base font-extrabold">
            <span>Total</span>
            <span className="text-[var(--primary)]">{formatMoney(cart.subtotal, currency)}</span>
          </div>
        </div>
        {Number(cart.discountAmount) > 0 && (
          <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--primary-soft)]/50 p-2 text-center text-xs font-semibold text-[var(--primary)]">
            You save {formatMoney(cart.discountAmount, currency)} on this order!
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--text-muted)]">Shipping is currently free while the Shipping module is being prepared.</p>
        <Link href="/checkout" className="mt-6 block">
          <Button className="w-full gap-2">Proceed to Checkout <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  );
}
