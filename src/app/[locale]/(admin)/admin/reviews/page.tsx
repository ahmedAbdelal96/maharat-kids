import { redirect } from "next/navigation";
import { AdminReviewsClient } from "@/modules/reviews/components/admin-reviews-client";
import { getAdminReviews } from "@/modules/reviews/server/queries";

export const metadata = { title: "Reviews | Admin", description: "Moderate verified product reviews." };

export default async function AdminReviewsPage() {
  const result = await getAdminReviews();
  if (!result.success) { if (result.error.code === "UNAUTHORIZED") redirect("/login?callbackUrl=/admin/reviews"); if (result.error.code === "FORBIDDEN") redirect("/forbidden"); throw result.error; }
  return <AdminReviewsClient initialData={result.data} />;
}
