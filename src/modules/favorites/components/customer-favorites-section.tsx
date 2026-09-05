"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductGrid } from "@/components/ecommerce/product-grid";
import type { Product } from "@/modules/products/types";
import type { FavoriteProduct } from "../types";

export function CustomerFavoritesSection({ favorites, currency = "USD" }: { favorites: FavoriteProduct[]; currency?: string }) {
  const [items, setItems] = useState(favorites);
  const products = items.map((favorite) => favorite.product);

  if (products.length === 0) {
    return <Card><CardContent className="flex flex-col items-center px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><Heart className="h-5 w-5" /></div><h3 className="mt-4 text-base font-bold">Your favorites are waiting</h3><p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">Save products you love and find them here whenever you are ready.</p><Link href="/products"><Button className="mt-5">Browse Products</Button></Link></CardContent></Card>;
  }

  function handleFavoriteChange(product: Product, isFavorite: boolean) {
    if (!isFavorite) {
      setItems((current) => current.filter((favorite) => favorite.product.id !== product.id));
    }
  }

  return <ProductGrid products={products} currency={currency} favoriteProductIds={items.map((favorite) => favorite.product.id)} onFavoriteChange={handleFavoriteChange} columns={3} />;
}
