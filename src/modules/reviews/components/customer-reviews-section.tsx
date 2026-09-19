"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ReviewForm } from "./review-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductImage } from "@/components/ecommerce/product-image";
import type { CustomerReviewsPage, Review } from "../types";

function ReviewEditor({ review, productId, onClose }: { review?: Review; productId: string; onClose: () => void }) {
  return <div className="mt-3"><ReviewForm productId={productId} existingReview={review} onSaved={onClose} /></div>;
}

export function CustomerReviewsSection({ data }: { data: CustomerReviewsPage }) {
  const [editing, setEditing] = useState<string | null>(null);
  return <div className="space-y-6">
    <section>
      <h3 className="text-base font-bold">To Review</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Products from delivered purchases that are ready for your feedback.</p>
      <div className="mt-4 grid gap-3">
        {data.toReview.length === 0 ? <Card><CardContent className="p-6 text-sm text-[var(--text-secondary)]">You have no products waiting for a review.</CardContent></Card> : data.toReview.map((item) => (
          <Card key={item.productId}><CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)]"><ProductImage src={item.imageUrl ?? undefined} alt={item.productName} aspectRatio="square" /></div>
            <div className="min-w-0 flex-1"><Link href={`/products/${item.productSlug}`} className="text-sm font-bold hover:text-[var(--primary)]">{item.productName}</Link><p className="mt-1 text-xs text-[var(--text-secondary)]">Order #{item.orderNumber}</p></div>
            <button type="button" onClick={() => setEditing(editing === item.productId ? null : item.productId)} className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{editing === item.productId ? "Close" : "Write a Review"}</button>
            {editing === item.productId ? <div className="basis-full"><ReviewEditor productId={item.productId} onClose={() => setEditing(null)} /></div> : null}
          </CardContent></Card>
        ))}
      </div>
    </section>
    <section>
      <h3 className="text-base font-bold">My Reviews</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Your reviews and their moderation status.</p>
      <div className="mt-4 grid gap-3">
        {data.reviews.length === 0 ? <Card><CardContent className="p-6 text-sm text-[var(--text-secondary)]">Your submitted reviews will appear here.</CardContent></Card> : data.reviews.map((review) => (
          <Card key={review.id}><CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={review.productSlug ? `/products/${review.productSlug}` : "#"} className="text-sm font-bold hover:text-[var(--primary)]">{review.productName}</Link><p className="mt-1 text-xs text-[var(--text-secondary)]">{review.rating}/5 · Order #{review.orderNumber}</p></div><Badge variant={review.status === "APPROVED" ? "success" : review.status === "REJECTED" ? "destructive" : "warning"} size="sm">{review.status === "APPROVED" ? "Published" : review.status === "REJECTED" ? "Needs changes" : "Pending review"}</Badge></div>
            {review.comment ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{review.comment}</p> : null}
            {review.customerVisibleModerationReason ? <p className="mt-3 rounded bg-[var(--destructive-subtle)] p-2 text-xs text-[var(--destructive)]">{review.customerVisibleModerationReason}</p> : null}
            <button type="button" className="mt-3 text-xs font-semibold text-[var(--primary)] underline" onClick={() => setEditing(editing === review.id ? null : review.id)}>{editing === review.id ? "Close editor" : "Edit review"}</button>
            {editing === review.id ? <ReviewEditor productId={review.productId} review={review} onClose={() => setEditing(null)} /> : null}
          </CardContent></Card>
        ))}
      </div>
    </section>
  </div>;
}
