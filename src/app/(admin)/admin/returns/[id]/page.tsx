import { notFound, redirect } from "next/navigation";
import { AdminReturnDetailsClient } from "@/modules/returns/components/admin-return-details-client";
import { getAdminReturnDetails } from "@/modules/returns/server/queries";

export const dynamic = "force-dynamic";

export default async function AdminReturnDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAdminReturnDetails(id);
  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") redirect(`/login?returnTo=/admin/returns/${encodeURIComponent(id)}`);
    if (result.error.code === "FORBIDDEN") redirect("/forbidden");
    if (result.error.code === "RETURN_NOT_FOUND") notFound();
    throw result.error;
  }
  return <AdminReturnDetailsClient initialReturn={result.data} />;
}
