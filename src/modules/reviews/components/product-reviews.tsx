"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductRating } from "@/components/ecommerce/product-rating";
import { ReviewForm } from "./review-form";
import type { PublicReviewPage, ReviewEligibility } from "../types";

export function ProductReviews({ productId, initialReviews, eligibility }: { productId: string; initialReviews: PublicReviewPage; eligibility: ReviewEligibility | null }) {
  const [showForm, setShowForm] = useState(false);
  const { summary } = initialReviews;
  return <section className="space-y-5" aria-labelledby="reviews-heading">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Customer feedback</p><h2 id="reviews-heading" className="mt-1 text-xl font-bold">Reviews</h2></div>{eligibility?.eligible && <Button size="sm" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "Write a Review"}</Button>}{eligibility?.existingReview && <Button size="sm" variant="outline" onClick={() => setShowForm((current) => !current)}>{showForm ? "Close" : "Edit your Review"}</Button>}</div>
    {showForm && eligibility && (eligibility.eligible || eligibility.existingReview) && <ReviewForm productId={productId} existingReview={eligibility.existingReview} onSaved={() => setShowForm(false)} />}
    <div className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:grid-cols-[180px_minmax(0,1fr)]"><div className="text-center sm:border-r sm:border-[var(--border)] sm:pr-5"><p className="text-3xl font-extrabold">{summary.average.toFixed(1)}</p><ProductRating rating={summary.average} reviewCount={summary.count} size="md" className="mt-2" /><p className="mt-2 text-xs text-[var(--text-muted)]">Based on {summary.count} approved review{summary.count === 1 ? "" : "s"}</p></div><div className="space-y-2 self-center">{[5, 4, 3, 2, 1].map((value) => <div key={value} className="flex items-center gap-2 text-xs"><span className="w-10 text-[var(--text-secondary)]">{value} star</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${summary.count ? (summary.distribution[value as 1 | 2 | 3 | 4 | 5] / summary.count) * 100 : 0}%` }} /></div><span className="w-5 text-right text-[var(--text-muted)]">{summary.distribution[value as 1 | 2 | 3 | 4 | 5]}</span></div>)}</div></div>
    {initialReviews.items.length === 0 ? <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-secondary)]">No reviews yet. Be the first verified customer to share your experience.</div> : <div className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)]">{initialReviews.items.map((review) => <article key={review.id} className="space-y-2 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><ProductRating rating={review.rating} showCount={false} /><span className="text-sm font-semibold">{review.customerName}</span><Badge variant="secondary" size="sm" className="gap-1"><Star className="h-3 w-3 fill-current" />Verified Purchase</Badge></div><time className="text-xs text-[var(--text-muted)]" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time></div>{review.comment && <p className="text-sm leading-6 text-[var(--text-secondary)]">{review.comment}</p>}</article>)}</div>}
  </section>;
}
