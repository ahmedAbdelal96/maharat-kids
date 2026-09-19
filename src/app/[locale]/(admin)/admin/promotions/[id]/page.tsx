import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromotionForm } from "@/modules/promotions/components/promotion-form";
import { getAdminPromotion, getPromotionLimitsUsage } from "@/modules/promotions/server/queries";

export const metadata = {
  title: "Edit Promotion | Admin",
  description: "Edit promotional offer configuration",
};

export default async function AdminEditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [promoResult, limitsResult] = await Promise.all([
    getAdminPromotion(id),
    getPromotionLimitsUsage(id),
  ]);

  if (!promoResult.success) {
    if (promoResult.error.code === "UNAUTHENTICATED") {
      redirect(`/auth/login?next=/admin/promotions/${id}`);
    }
    if (promoResult.error.code === "FORBIDDEN") {
      redirect("/admin/promotions");
    }
    notFound();
  }

  const promo = promoResult.data;
  const limits = limitsResult.success
    ? limitsResult.data
    : { activeCount: 0, maxActive: 10, heroCount: 0, maxHero: 3 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/promotions">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {promo.name}
              </h1>
              {Boolean(promo.orderCount && promo.orderCount > 0) && (
                <Badge variant="secondary" size="sm">
                  {promo.orderCount} Orders
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Slug: <code className="font-mono text-[11px]">{promo.slug}</code>
            </p>
          </div>
        </div>

        {promo.showOnOffersPage && promo.status === "ACTIVE" && (
          <Link href={`/offers/${promo.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs">
              View Store Offer Page
            </Button>
          </Link>
        )}
      </div>

      <PromotionForm initialData={promo} limits={limits} />
    </div>
  );
}
