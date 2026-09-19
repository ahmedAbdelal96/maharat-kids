"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import Image from "next/image";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Gift,
  Layers,
  Percent,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaUploader, type MediaSelection } from "@/modules/media/components/media-uploader";

function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-xs font-semibold ${props.className || ""}`} />;
}
import { ProductPickerModal } from "./product-picker-modal";
import { createPromotion, updatePromotion } from "../server/actions";
import { PROMOTION_TYPE_LABELS, type PromotionType } from "../constants";
import type { Promotion, PromotionProductRef } from "../types";
import { formatMoney } from "@/lib/formatters";

function toDateTimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function PromotionForm({
  initialData,
  limits,
}: {
  initialData?: Promotion;
  limits?: { activeCount: number; maxActive: number; heroCount: number; maxHero: number };
}) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<PromotionType>(initialData?.type ?? "ORDER_PERCENTAGE_DISCOUNT");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [showInHero, setShowInHero] = useState(initialData?.showInHero ?? false);
  const [showOnOffersPage, setShowOnOffersPage] = useState(initialData?.showOnOffersPage ?? true);
  const [priority, setPriority] = useState<number>(initialData?.priority ?? 0);

  // Default startsAt to now or existing
  const [startsAt, setStartsAt] = useState(
    initialData ? toDateTimeLocal(initialData.startsAt) : toDateTimeLocal(new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(initialData?.endsAt));

  // Type specific states
  const [percentageDiscount, setPercentageDiscount] = useState<string>(
    initialData?.percentageDiscount ?? "10",
  );
  const [fixedDiscountAmount, setFixedDiscountAmount] = useState<string>(
    initialData?.fixedDiscountAmount ?? "10.00",
  );
  const [minimumOrderSubtotal, setMinimumOrderSubtotal] = useState<string>(
    initialData?.minimumOrderSubtotal ?? "",
  );

  // BOGO states
  const [qualifyingProduct, setQualifyingProduct] = useState<PromotionProductRef | null>(
    initialData?.qualifyingProduct ?? null,
  );
  const [buyQuantity, setBuyQuantity] = useState<number>(initialData?.buyQuantity ?? 1);
  const [giftProduct, setGiftProduct] = useState<PromotionProductRef | null>(
    initialData?.giftProduct ?? null,
  );
  const [giftQuantity, setGiftQuantity] = useState<number>(initialData?.giftQuantity ?? 1);

  // Modals
  const [pickingProductFor, setPickingProductFor] = useState<"qualifying" | "gift" | null>(null);

  // Media Banner
  const [mediaImages, setMediaImages] = useState<MediaSelection[]>(
    initialData?.bannerMediaId && initialData.bannerUrl
      ? [
          {
            mediaId: initialData.bannerMediaId,
            url: initialData.bannerUrl,
            sortOrder: 0,
            isPrimary: true,
          },
        ]
      : [],
  );

  // UI State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [validationIssues, setValidationIssues] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setValidationIssues({});
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim() || undefined,
        type,
        isActive,
        showInHero,
        showOnOffersPage,
        priority: Number(priority) || 0,
        startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        bannerMediaId: mediaImages[0]?.mediaId ?? null,
      };

      if (type === "ORDER_PERCENTAGE_DISCOUNT") {
        payload.percentageDiscount = parseFloat(percentageDiscount) || 0;
        payload.minimumOrderSubtotal = minimumOrderSubtotal.trim() ? parseFloat(minimumOrderSubtotal) : null;
        payload.fixedDiscountAmount = null;
        payload.qualifyingProductId = null;
        payload.buyQuantity = null;
        payload.giftProductId = null;
        payload.giftQuantity = null;
      } else if (type === "ORDER_FIXED_DISCOUNT") {
        payload.fixedDiscountAmount = parseFloat(fixedDiscountAmount) || 0;
        payload.minimumOrderSubtotal = minimumOrderSubtotal.trim() ? parseFloat(minimumOrderSubtotal) : null;
        payload.percentageDiscount = null;
        payload.qualifyingProductId = null;
        payload.buyQuantity = null;
        payload.giftProductId = null;
        payload.giftQuantity = null;
      } else if (type === "BUY_X_GET_Y_FREE") {
        payload.qualifyingProductId = qualifyingProduct?.id ?? null;
        payload.buyQuantity = Number(buyQuantity) || 1;
        payload.giftProductId = giftProduct?.id ?? null;
        payload.giftQuantity = Number(giftQuantity) || 1;
        payload.percentageDiscount = null;
        payload.fixedDiscountAmount = null;
        payload.minimumOrderSubtotal = null;
      }

      let res;
      if (isEditing && initialData) {
        res = await updatePromotion({
          id: initialData.id,
          ...payload,
        });
      } else {
        res = await createPromotion(payload);
      }

      if (!res.success) {
        setError(res.error.message || "Failed to save promotion.");
        if ("details" in res.error) {
          const details = res.error.details as { issues?: Array<{ path?: string[]; message: string }> };
          if (details?.issues) {
            const issuesMap: Record<string, string> = {};
            for (const issue of details.issues) {
              const field = issue.path?.join(".");
              if (field) issuesMap[field] = issue.message;
            }
            setValidationIssues(issuesMap);
          }
        }
      } else {
        router.push("/admin/promotions");
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--destructive)]/40 bg-[var(--destructive-soft)] p-4 text-xs text-[var(--destructive)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Configuration Columns (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Offer Identity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-[var(--primary)]" />
                Offer Identity & Copy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Campaign Name <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Kickoff Sale, Spend 100 Get 15% Off"
                  required
                  className="text-xs"
                />
                {validationIssues.name && (
                  <p className="text-[11px] text-[var(--destructive)]">{validationIssues.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shortDescription" className="text-xs font-semibold">
                  Headline / Short Summary <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Input
                  id="shortDescription"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="e.g. Get 15% off any order over $100 this weekend."
                  required
                  maxLength={160}
                  className="text-xs"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Appears on homepage banners, badges, and /offers cards (max 160 chars).
                </p>
                {validationIssues.shortDescription && (
                  <p className="text-[11px] text-[var(--destructive)]">
                    {validationIssues.shortDescription}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Detailed Terms & Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any offer terms, conditions, or exclusions to display on the offer detail page."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Commercial Type & Reward */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                Commercial Type & Reward
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(Object.keys(PROMOTION_TYPE_LABELS) as PromotionType[]).map((t) => {
                  const isSelected = type === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex flex-col items-start justify-between rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]/30 text-[var(--text-primary)]"
                          : "border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        {t === "ORDER_PERCENTAGE_DISCOUNT" && <Percent className="h-4 w-4 text-[var(--primary)]" />}
                        {t === "ORDER_FIXED_DISCOUNT" && <Tag className="h-4 w-4 text-[var(--primary)]" />}
                        {t === "BUY_X_GET_Y_FREE" && <Gift className="h-4 w-4 text-[var(--primary)]" />}
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />}
                      </div>
                      <span className="mt-2 text-xs font-semibold text-[var(--text-primary)]">
                        {PROMOTION_TYPE_LABELS[t]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic inputs based on type */}
              {type === "ORDER_PERCENTAGE_DISCOUNT" && (
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="percentageDiscount" className="text-xs font-semibold">
                      Discount Percentage (%) <span className="text-[var(--destructive)]">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="percentageDiscount"
                        type="number"
                        min="1"
                        max="100"
                        step="0.1"
                        value={percentageDiscount}
                        onChange={(e) => setPercentageDiscount(e.target.value)}
                        required
                        className="pr-8 text-xs"
                      />
                      <span className="absolute right-3 top-2 text-xs text-[var(--text-muted)]">%</span>
                    </div>
                    {validationIssues.percentageDiscount && (
                      <p className="text-[11px] text-[var(--destructive)]">
                        {validationIssues.percentageDiscount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="minimumOrderSubtotal" className="text-xs font-semibold">
                      Minimum Order Subtotal ($)
                    </Label>
                    <Input
                      id="minimumOrderSubtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={minimumOrderSubtotal}
                      onChange={(e) => setMinimumOrderSubtotal(e.target.value)}
                      placeholder="Optional, e.g. 100.00"
                      className="text-xs"
                    />
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Leave blank or 0 for no minimum subtotal threshold.
                    </p>
                  </div>
                </div>
              )}

              {type === "ORDER_FIXED_DISCOUNT" && (
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fixedDiscountAmount" className="text-xs font-semibold">
                      Fixed Discount Amount ($) <span className="text-[var(--destructive)]">*</span>
                    </Label>
                    <Input
                      id="fixedDiscountAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fixedDiscountAmount}
                      onChange={(e) => setFixedDiscountAmount(e.target.value)}
                      required
                      className="text-xs"
                    />
                    {validationIssues.fixedDiscountAmount && (
                      <p className="text-[11px] text-[var(--destructive)]">
                        {validationIssues.fixedDiscountAmount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="minimumOrderSubtotal" className="text-xs font-semibold">
                      Minimum Order Subtotal ($)
                    </Label>
                    <Input
                      id="minimumOrderSubtotal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={minimumOrderSubtotal}
                      onChange={(e) => setMinimumOrderSubtotal(e.target.value)}
                      placeholder="Optional, e.g. 150.00"
                      className="text-xs"
                    />
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Leave blank or 0 for no minimum subtotal threshold.
                    </p>
                  </div>
                </div>
              )}

              {type === "BUY_X_GET_Y_FREE" && (
                <div className="space-y-4 pt-2">
                  {/* Step 1: Qualifying product */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        1. Qualifying Product (Customer Buys) <span className="text-[var(--destructive)]">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPickingProductFor("qualifying")}
                        className="text-xs h-7"
                      >
                        {qualifyingProduct ? "Change Product" : "Select Product"}
                      </Button>
                    </div>

                    {qualifyingProduct ? (
                      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {qualifyingProduct.imageUrl ? (
                            <Image
                              src={qualifyingProduct.imageUrl}
                              alt={qualifyingProduct.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-[var(--border)]" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{qualifyingProduct.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {formatMoney(qualifyingProduct.price, "USD")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor="buyQuantity" className="text-xs">
                            Buy Qty:
                          </Label>
                          <Input
                            id="buyQuantity"
                            type="number"
                            min="1"
                            value={buyQuantity}
                            onChange={(e) => setBuyQuantity(parseInt(e.target.value, 10) || 1)}
                            className="w-16 text-xs h-7"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        No qualifying product chosen yet.
                      </p>
                    )}
                    {validationIssues.qualifyingProductId && (
                      <p className="text-[11px] text-[var(--destructive)]">
                        {validationIssues.qualifyingProductId}
                      </p>
                    )}
                  </div>

                  {/* Step 2: Gift product */}
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        2. Gift Product (Customer Gets Free) <span className="text-[var(--destructive)]">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPickingProductFor("gift")}
                        className="text-xs h-7"
                      >
                        {giftProduct ? "Change Product" : "Select Product"}
                      </Button>
                    </div>

                    {giftProduct ? (
                      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {giftProduct.imageUrl ? (
                            <Image
                              src={giftProduct.imageUrl}
                              alt={giftProduct.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-[var(--border)]" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{giftProduct.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Regular price: {formatMoney(giftProduct.price, "USD")} (Added at $0.00)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor="giftQuantity" className="text-xs">
                            Gift Qty:
                          </Label>
                          <Input
                            id="giftQuantity"
                            type="number"
                            min="1"
                            value={giftQuantity}
                            onChange={(e) => setGiftQuantity(parseInt(e.target.value, 10) || 1)}
                            className="w-16 text-xs h-7"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        No free gift product chosen yet.
                      </p>
                    )}
                    {validationIssues.giftProductId && (
                      <p className="text-[11px] text-[var(--destructive)]">
                        {validationIssues.giftProductId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Banner Creative (Optional) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--primary)]" />
                Banner Creative (Hero & Offers Page)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MediaUploader
                kind="promotions"
                images={mediaImages}
                multiple={false}
                onChange={setMediaImages}
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Recommended aspect ratio: 16:9 or 21:9 for homepage hero backgrounds and offer cards.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings & Preview Column (1 Col) */}
        <div className="space-y-6">
          {/* Card 4: Schedule & Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--primary)]" />
                Schedule & Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label htmlFor="isActive" className="text-xs font-semibold cursor-pointer">
                    Offer Active
                  </Label>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Master switch for evaluation and display.
                  </p>
                </div>
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                />
              </div>

              {limits && (
                <div className="rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-2 text-[11px] text-[var(--text-muted)] flex justify-between items-center">
                  <span>Active Limit:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {limits.activeCount} / {limits.maxActive} slots used
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="startsAt" className="text-xs font-semibold">
                  Starts At <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endsAt" className="text-xs font-semibold">
                  Ends At (Optional)
                </Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Leave empty for an ongoing offer with no auto-expiration.
                </p>
                {validationIssues.endsAt && (
                  <p className="text-[11px] text-[var(--destructive)]">{validationIssues.endsAt}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Placements & Priority */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Placements & Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label htmlFor="showInHero" className="text-xs font-semibold cursor-pointer">
                    Show in Homepage Hero
                  </Label>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Feature in the top hero campaign carousel.
                  </p>
                </div>
                <input
                  id="showInHero"
                  type="checkbox"
                  checked={showInHero}
                  onChange={(e) => setShowInHero(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                />
              </div>

              {limits && (
                <div className="rounded-[var(--radius-sm)] bg-[var(--surface-muted)] p-2 text-[11px] text-[var(--text-muted)] flex justify-between items-center">
                  <span>Hero Campaign Limit:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {limits.heroCount} / {limits.maxHero} slots used
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label htmlFor="showOnOffersPage" className="text-xs font-semibold cursor-pointer">
                    Show on /offers Page
                  </Label>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Display on customer offers catalog page.
                  </p>
                </div>
                <input
                  id="showOnOffersPage"
                  type="checkbox"
                  checked={showOnOffersPage}
                  onChange={(e) => setShowOnOffersPage(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs font-semibold">
                  Evaluation Priority (0-100)
                </Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                  className="text-xs"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Higher priority offers are checked first and preferred during cart tie-breaks.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Live Card Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Customer Card Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <div className="relative aspect-[16/9] w-full bg-[var(--surface-muted)]">
                  {mediaImages[0]?.url ? (
                    <Image
                      src={mediaImages[0].url}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                      <Sparkles className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="accent" size="sm">
                      {PROMOTION_TYPE_LABELS[type]}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                    {name || "Promotion Campaign Name"}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                    {shortDescription || "Short summary of the promotion discount or free gift reward."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 text-xs"
            >
              {saving ? "Saving Offer..." : isEditing ? "Update Promotion" : "Create Promotion"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => router.push("/admin/promotions")}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>

      {/* Product Picker Modal Island */}
      <ProductPickerModal
        isOpen={pickingProductFor !== null}
        onClose={() => setPickingProductFor(null)}
        title={
          pickingProductFor === "qualifying"
            ? "Select Qualifying Product (Buy X)"
            : "Select Gift Product (Get Y Free)"
        }
        selectedProductId={
          pickingProductFor === "qualifying" ? qualifyingProduct?.id : giftProduct?.id
        }
        onSelect={(prod) => {
          if (pickingProductFor === "qualifying") {
            setQualifyingProduct(prod);
          } else if (pickingProductFor === "gift") {
            setGiftProduct(prod);
          }
          setPickingProductFor(null);
        }}
      />
    </div>
  );
}
