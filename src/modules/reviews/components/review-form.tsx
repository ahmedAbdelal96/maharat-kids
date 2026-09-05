"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createProductReview, updateProductReview } from "../server/actions";
import type { Review } from "../types";

export function ReviewForm({ productId, existingReview, onSaved }: { productId: string; existingReview?: Review | null; onSaved?: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true); setMessage("");
    const result = existingReview
      ? await updateProductReview({ reviewId: existingReview.id, productId, rating, comment })
      : await createProductReview({ productId, rating, comment });
    setSaving(false);
    if (!result.success) { setMessage(result.error.message); return; }
    setMessage(existingReview ? "Review sent for moderation again." : "Review submitted for moderation.");
    router.refresh();
    onSaved?.();
  }

  return <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
    <div><p className="text-sm font-bold">{existingReview ? "Edit your review" : "Write a review"}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Your review will be published after a quick moderation check.</p></div>
    <fieldset><legend className="text-xs font-semibold">Rating</legend><div className="mt-2 flex gap-1" role="radiogroup" aria-label="Product rating">
      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)} className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><Star className={`h-6 w-6 ${value <= rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"}`} /></button>)}
    </div></fieldset>
    <label className="block text-xs font-semibold">Comment <span className="font-normal text-[var(--text-muted)]">(optional)</span><Textarea value={comment} maxLength={1500} onChange={(event) => setComment(event.target.value)} placeholder="Share your experience with this product" rows={4} className="mt-1.5 bg-[var(--surface)]" /></label>
    {message && <p role="status" className="text-xs font-medium text-[var(--text-secondary)]">{message}</p>}
    <Button type="button" disabled={saving || rating === 0} isLoading={saving} onClick={() => void submit()}>{existingReview ? "Save Review" : "Submit Review"}</Button>
  </div>;
}
