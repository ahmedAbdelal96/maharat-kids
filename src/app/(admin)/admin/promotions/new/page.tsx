import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionForm } from "@/modules/promotions/components/promotion-form";
import { getPromotionLimitsUsage } from "@/modules/promotions/server/queries";

export const metadata = {
  title: "New Promotion | Admin",
  description: "Create a new promotional offer or campaign",
};

export default async function AdminNewPromotionPage() {
  const limitsResult = await getPromotionLimitsUsage();
  if (!limitsResult.success) {
    if (limitsResult.error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?next=/admin/promotions/new");
    }
    if (limitsResult.error.code === "FORBIDDEN") {
      redirect("/admin/promotions");
    }
  }

  const limits = limitsResult.success
    ? limitsResult.data
    : { activeCount: 0, maxActive: 10, heroCount: 0, maxHero: 3 };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/promotions">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Create Promotion
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Set up an order discount or buy X get Y free offer.
          </p>
        </div>
      </div>

      <PromotionForm limits={limits} />
    </div>
  );
}
