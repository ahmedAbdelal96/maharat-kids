"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Gift,
  Pencil,
  Percent,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { deletePromotion } from "../server/actions";
import { PROMOTION_TYPE_LABELS, type PromotionType } from "../constants";
import type { PromotionStatus, PromotionSummary } from "../types";
import { formatMoney } from "@/lib/formatters";

type FilterTab = "ALL" | "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE" | "HERO";

function getStatusBadge(status: PromotionStatus) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success" size="sm">Active</Badge>;
    case "SCHEDULED":
      return <Badge variant="secondary" size="sm">Scheduled</Badge>;
    case "EXPIRED":
      return <Badge variant="outline" size="sm">Expired</Badge>;
    case "INACTIVE":
      return <Badge variant="outline" size="sm">Disabled</Badge>;
    default:
      return null;
  }
}

function formatRuleSummary(item: PromotionSummary): string {
  if (item.type === "ORDER_PERCENTAGE_DISCOUNT") {
    const pct = `${item.percentageDiscount}% off`;
    return item.minimumOrderSubtotal
      ? `${pct} orders over ${formatMoney(item.minimumOrderSubtotal, "USD")}`
      : `${pct} all orders`;
  }
  if (item.type === "ORDER_FIXED_DISCOUNT") {
    const amt = `${formatMoney(item.fixedDiscountAmount ?? "0", "USD")} off`;
    return item.minimumOrderSubtotal
      ? `${amt} orders over ${formatMoney(item.minimumOrderSubtotal, "USD")}`
      : `${amt} all orders`;
  }
  if (item.type === "BUY_X_GET_Y_FREE") {
    const buy = item.qualifyingProductName ? `Buy ${item.buyQuantity ?? 1}x ${item.qualifyingProductName}` : `Buy ${item.buyQuantity ?? 1}`;
    const gift = item.giftProductName ? `Get ${item.giftQuantity ?? 1}x ${item.giftProductName} Free` : `Get ${item.giftQuantity ?? 1} Free`;
    return `${buy} → ${gift}`;
  }
  return "";
}

export function AdminPromotionsClient({
  promotions,
  limits,
}: {
  promotions: PromotionSummary[];
  limits: { activeCount: number; maxActive: number; heroCount: number; maxHero: number };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [promotionToDelete, setPromotionToDelete] = useState<PromotionSummary | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const scheduledCount = promotions.filter((p) => p.status === "SCHEDULED").length;
  const expiredCount = promotions.filter((p) => p.status === "EXPIRED").length;

  const filteredPromotions = promotions.filter((item) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.shortDescription.toLowerCase().includes(q);
      const matchQual = item.qualifyingProductName?.toLowerCase().includes(q);
      const matchGift = item.giftProductName?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchQual && !matchGift) return false;
    }

    // Tab filter
    if (activeTab === "HERO") {
      return item.showInHero;
    }
    if (activeTab !== "ALL") {
      return item.status === activeTab;
    }
    return true;
  });

  async function confirmDelete() {
    if (!promotionToDelete) return;
    setDeleteError("");

    startTransition(async () => {
      const res = await deletePromotion(promotionToDelete.id);
      if (!res.success) {
        setDeleteError(res.error.message || "Failed to delete promotion.");
      } else {
        setPromotionToDelete(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Promotions & Campaigns
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage percentage/fixed order discounts, BOGO gift rewards, and homepage hero campaigns.
          </p>
        </div>
        <Link href="/admin/promotions/new">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            New Promotion
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Active Offers</span>
            <Tag className="h-4 w-4 text-[var(--success)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{limits.activeCount}</span>
            <span className="text-xs text-[var(--text-muted)]">/ {limits.maxActive} max</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Hero Campaigns</span>
            <Sparkles className="h-4 w-4 text-[var(--primary)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{limits.heroCount}</span>
            <span className="text-xs text-[var(--text-muted)]">/ {limits.maxHero} max</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Scheduled</span>
            <Clock className="h-4 w-4 text-[var(--info)]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{scheduledCount}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-muted)]">Expired</span>
            <XCircle className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{expiredCount}</span>
          </div>
        </Card>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: "ALL", label: "All" },
              { key: "ACTIVE", label: "Active" },
              { key: "SCHEDULED", label: "Scheduled" },
              { key: "EXPIRED", label: "Expired" },
              { key: "INACTIVE", label: "Disabled" },
              { key: "HERO", label: "Hero Placements" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Promotions List Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaign & Summary</th>
                <th className="px-4 py-3 font-semibold">Offer Rule</th>
                <th className="px-4 py-3 font-semibold">Status & Schedule</th>
                <th className="px-4 py-3 font-semibold text-center">Placements</th>
                <th className="px-4 py-3 font-semibold text-center">Orders</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No promotions found matching your current filter.
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                    {/* Campaign Identity */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/promotions/${item.id}`}
                            className="font-semibold text-[var(--text-primary)] hover:underline truncate"
                          >
                            {item.name}
                          </Link>
                          {item.priority > 0 && (
                            <Badge variant="outline" size="sm" className="text-[10px] py-0 px-1">
                              p:{item.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                          {item.shortDescription}
                        </p>
                      </div>
                    </td>

                    {/* Offer Rule */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {item.type === "ORDER_PERCENTAGE_DISCOUNT" && <Percent className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />}
                          {item.type === "ORDER_FIXED_DISCOUNT" && <Tag className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />}
                          {item.type === "BUY_X_GET_Y_FREE" && <Gift className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />}
                          <span className="font-medium text-[var(--text-primary)]">
                            {PROMOTION_TYPE_LABELS[item.type as PromotionType]}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">
                          {formatRuleSummary(item)}
                        </p>
                      </div>
                    </td>

                    {/* Status & Schedule */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getStatusBadge(item.status)}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {new Date(item.startsAt).toLocaleDateString()}
                          {item.endsAt ? ` → ${new Date(item.endsAt).toLocaleDateString()}` : " (Ongoing)"}
                        </div>
                      </div>
                    </td>

                    {/* Placements */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {item.showInHero && (
                          <Badge variant="accent" size="sm" className="gap-1 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5" /> Hero
                          </Badge>
                        )}
                        {item.showOnOffersPage && (
                          <Badge variant="secondary" size="sm" className="text-[10px]">
                            Offers
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Order Count */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-[var(--text-primary)]">{item.orderCount}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/promotions/${item.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit">
                            <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          </Button>
                        </Link>
                        {item.showOnOffersPage && item.status === "ACTIVE" && (
                          <Link href={`/offers/${item.slug}`} target="_blank">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Store Page">
                              <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
                          onClick={() => {
                            setDeleteError("");
                            setPromotionToDelete(item);
                          }}
                          title="Delete Promotion"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={promotionToDelete !== null}
        onClose={() => setPromotionToDelete(null)}
        title="Delete Promotion"
        description="Are you sure you want to delete this promotional offer?"
      >
        {promotionToDelete && (
          <div className="space-y-4">
            {promotionToDelete.orderCount > 0 ? (
              <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-3 text-xs text-[var(--warning-foreground)]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)] mt-0.5" />
                <div>
                  <p className="font-semibold">Cannot delete promotion with order history</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    This promotion has been applied to {promotionToDelete.orderCount} customer order(s).
                    To preserve accurate financial and order snapshot history, please disable this promotion instead of deleting it.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                This will permanently delete the campaign <strong className="text-[var(--text-primary)]">{promotionToDelete.name}</strong>. This action cannot be undone.
              </p>
            )}

            {deleteError && (
              <p className="text-xs text-[var(--destructive)]">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPromotionToDelete(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {promotionToDelete.orderCount === 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete Permanently"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
