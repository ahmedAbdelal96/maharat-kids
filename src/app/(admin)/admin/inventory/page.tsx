import { getInventoryPage } from "@/modules/inventory/server/queries";
import { AdminInventoryClient } from "@/modules/inventory/components/admin-inventory-client";
import type { InventoryFilter } from "@/modules/inventory/types";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED"; page?: string }> }) {
  const query = await searchParams;
  const filter = ["ALL", "TRACKED", "UNTRACKED", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"].includes(query.filter ?? "") ? query.filter as InventoryFilter : "ALL";
  const result = await getInventoryPage({ search: query.q, filter, status: query.status, page: Number(query.page) || 1, pageSize: 20 });
  if (!result.success) throw result.error;
  return <AdminInventoryClient page={result.data} initialFilters={{ search: query.q ?? "", filter, status: query.status ?? "ALL" }} />;
}
