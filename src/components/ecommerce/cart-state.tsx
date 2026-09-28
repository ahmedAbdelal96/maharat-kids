"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Cart } from "@/modules/cart/types";
import { optimisticAddToCart } from "@/modules/cart/client/optimistic";

export type CartMutationResult = { success: boolean; data?: Cart; error?: { message: string } };
type CartAction = () => Promise<CartMutationResult>;

type CartStateValue = {
  cart: Cart;
  isPending: (key: string) => boolean;
  addOptimistically: (key: string, quantity: number, action: CartAction) => Promise<CartMutationResult>;
  runMutation: (key: string, action: CartAction) => Promise<CartMutationResult>;
};

const CartStateContext = createContext<CartStateValue | null>(null);

function useCartStateValue(initialCart: Cart): CartStateValue {
  const [cart, setCart] = useState(initialCart);
  const cartRef = useRef(initialCart);
  const pendingRef = useRef(new Set<string>());
  const [, setPendingVersion] = useState(0);

  useEffect(() => {
    if (pendingRef.current.size === 0) {
      cartRef.current = initialCart;
      setCart(initialCart);
    }
  }, [initialCart]);

  const isPending = useCallback((key: string) => pendingRef.current.has(key), []);

  const run = useCallback(async (key: string, action: CartAction, optimistic?: (current: Cart) => Cart) => {
    if (pendingRef.current.has(key)) return { success: false, error: { message: "CART_MUTATION_PENDING" } };
    const snapshot = cartRef.current;
    pendingRef.current.add(key);
    setPendingVersion((value) => value + 1);
    if (optimistic) {
      const next = optimistic(snapshot);
      cartRef.current = next;
      setCart(next);
    }
    try {
      const result = await action();
      if (result.success && result.data) {
        cartRef.current = result.data;
        setCart(result.data);
      } else if (!result.success) {
        cartRef.current = snapshot;
        setCart(snapshot);
      }
      return result;
    } catch {
      cartRef.current = snapshot;
      setCart(snapshot);
      return { success: false, error: { message: "CART_MUTATION_FAILED" } };
    } finally {
      pendingRef.current.delete(key);
      setPendingVersion((value) => value + 1);
    }
  }, []);

  const addOptimistically = useCallback((key: string, quantity: number, action: CartAction) => run(key, action, (current) => optimisticAddToCart(current, quantity)), [run]);
  const runMutation = useCallback((key: string, action: CartAction) => run(key, action), [run]);
  return { cart, isPending, addOptimistically, runMutation };
}

export function CartStateProvider({ initialCart, children }: { initialCart: Cart; children: ReactNode }) {
  return <CartStateContext.Provider value={useCartStateValue(initialCart)}>{children}</CartStateContext.Provider>;
}

export function useCartState(): CartStateValue {
  const value = useContext(CartStateContext);
  if (!value) throw new Error("useCartState must be used inside CartStateProvider");
  return value;
}
