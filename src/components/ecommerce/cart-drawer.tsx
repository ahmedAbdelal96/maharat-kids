"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ecommerce/product-image";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/formatters";
import { removeCartItem, updateCartItemQuantity } from "@/modules/cart/server/actions";
import type { Cart } from "@/modules/cart/types";

type CartMutationResult = { success: boolean; data?: Cart; error?: { message: string } };

export function CartDrawer({ isOpen, onClose, cart: initialCart, currency = "USD" }: { isOpen: boolean; onClose: () => void; cart: Cart | null; currency?: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const initialCartKey = initialCart ? `${initialCart.id}:${initialCart.itemCount}:${initialCart.subtotal}` : "empty";
  const [localCart, setLocalCart] = useState<{ key: string; value: Cart | null } | null>(null);
  const cart = localCart?.key === initialCartKey ? localCart.value : initialCart;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const items = cart?.items ?? [];

  async function mutate(cartItemId: string, action: () => Promise<CartMutationResult>) {
    setBusyId(cartItemId);
    setError("");
    const result = await action();
    if (!result.success) setError(result.error?.message ?? "Cart update could not be completed.");
    else if (result.data) setLocalCart({ key: initialCartKey, value: result.data });
    router.refresh();
    setBusyId(null);
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={`Shopping Cart (${cart?.itemCount ?? 0})`} description="Review your saved items before checkout.">
      <div className="flex h-full flex-col justify-between">
        {error && <p role="alert" className="mb-3 rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><ShoppingBag className="h-7 w-7" /></div>
            <h4 className="mt-4 text-base font-bold">Your cart is empty</h4>
            <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">Browse the catalog and add products to your shopping cart.</p>
            <Link href="/products" onClick={onClose}><Button variant="outline" size="sm" className="mt-5">Continue Shopping</Button></Link>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto pr-1">
              {items.map((item) => {
                const atStockLimit = item.availableStock !== null && item.quantity >= item.availableStock;
                return <motion.div key={item.id} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }} className="flex gap-3 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="truncate text-sm font-semibold">{item.name}</h4><p className="mt-0.5 text-xs text-[var(--primary)]">{formatMoney(item.unitPrice, currency)} each</p></div><Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} disabled={busyId === item.id} onClick={() => mutate(item.id, () => removeCartItem({ cartItemId: item.id }))}><Trash2 className="h-3.5 w-3.5 text-[var(--destructive)]" /></Button></div><div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)]"><Button variant="ghost" size="icon" aria-label={`Decrease ${item.name}`} disabled={busyId === item.id || item.quantity <= 1 || !item.isAvailable} onClick={() => mutate(item.id, () => updateCartItemQuantity({ cartItemId: item.id, quantity: item.quantity - 1 }))}><Minus className="h-3 w-3" /></Button><span className="w-6 text-center text-xs font-bold">{item.quantity}</span><Button variant="ghost" size="icon" aria-label={`Increase ${item.name}`} disabled={busyId === item.id || atStockLimit || !item.isAvailable} onClick={() => mutate(item.id, () => updateCartItemQuantity({ cartItemId: item.id, quantity: item.quantity + 1 }))}><Plus className="h-3 w-3" /></Button></div><span className="text-xs font-bold">{formatMoney(item.lineTotal, currency)}</span></div>{item.availableStock !== null && <p className="mt-2 text-[10px] text-[var(--text-muted)]">{item.availableStock} available</p>}{atStockLimit && <p className="mt-1 text-[10px] font-semibold text-[var(--warning)]">Maximum available quantity reached.</p>}{!item.isAvailable && <p className="mt-1 text-[10px] font-semibold text-[var(--destructive)]">No longer available</p>}</div>
                </motion.div>;
              })}
            </div>
          </AnimatePresence>
        )}
        {items.length > 0 && <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"><div className="flex items-center justify-between text-sm"><span className="text-[var(--text-secondary)]">Subtotal</span><span className="font-bold">{formatMoney(cart?.subtotal ?? "0", currency)}</span></div><div className="grid grid-cols-2 gap-2"><Link href="/cart" onClick={onClose}><Button variant="outline" className="w-full text-xs">View Cart</Button></Link><Link href="/checkout" onClick={onClose}><Button className="w-full gap-1.5 text-xs">Checkout <ArrowRight className="h-3.5 w-3.5" /></Button></Link></div></div>}
      </div>
    </Sheet>
  );
}
