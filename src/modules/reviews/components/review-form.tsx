"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createProductReview, updateProductReview } from "../server/actions";
import type { Review } from "../types";
import { useTranslations } from "next-intl";

export function ReviewForm({ productId, existingReview, onSaved }: { productId: string; existingReview?: Review | null; onSaved?: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useTranslations("reviews");

  async function submit() {
    setSaving(true); setMessage("");
    const result = existingReview
      ? await updateProductReview({ reviewId: existingReview.id, productId, rating, comment })
      : await createProductReview({ productId, rating, comment });
    setSaving(false);
    if (!result.success) { setMessage(result.error.message); return; }
    setMessage(existingReview ? t("resubmitted") : t("submitted"));
    router.refresh();
    onSaved?.();
  }

  return <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
    <div><p className="text-sm font-bold">{existingReview ? t("editYourReview") : t("write")}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{t("formDescription")}</p></div>
    <fieldset><legend className="text-xs font-semibold">{t("rating")}</legend><div className="mt-2 flex gap-1" role="radiogroup" aria-label={t("productRating")}>
      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={t("star", { count: value })} onClick={() => setRating(value)} className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><Star className={`h-6 w-6 ${value <= rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"}`} /></button>)}
    </div></fieldset>
    <label className="block text-xs font-semibold">{t("comment")} <span className="font-normal text-[var(--text-muted)]">({t("optional")})</span><Textarea value={comment} maxLength={1500} onChange={(event) => setComment(event.target.value)} placeholder={t("commentPlaceholder")} rows={4} className="mt-1.5 bg-[var(--surface)]" /></label>
    {message && <p role="status" className="text-xs font-medium text-[var(--text-secondary)]">{message}</p>}
    <Button type="button" disabled={saving || rating === 0} isLoading={saving} onClick={() => void submit()}>{existingReview ? t("save") : t("submit")}</Button>
  </div>;
}
