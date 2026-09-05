import { redirect } from "next/navigation";
import { AdminPromotionsClient } from "@/modules/promotions/components/admin-promotions-client";
import { getAdminPromotions, getPromotionLimitsUsage } from "@/modules/promotions/server/queries";

export const metadata = {
  title: "Promotions & Hero Campaigns | Admin",
  description: "Manage promotional offers, BOGO rewards, and homepage hero campaigns",
};

export default async function AdminPromotionsPage() {
  const [promotionsResult, limitsResult] = await Promise.all([
    getAdminPromotions(),
    getPromotionLimitsUsage(),
  ]);

  if (!promotionsResult.success) {
    if (promotionsResult.error.code === "UNAUTHENTICATED") {
      redirect("/auth/login?next=/admin/promotions");
    }
    if (promotionsResult.error.code === "FORBIDDEN") {
      redirect("/admin");
    }
    throw promotionsResult.error;
  }

  const limits = limitsResult.success
    ? limitsResult.data
    : { activeCount: 0, maxActive: 10, heroCount: 0, maxHero: 3 };

  return (
    <div className="space-y-6">
      <AdminPromotionsClient
        promotions={promotionsResult.data.items}
        limits={limits}
      />
    </div>
  );
}
