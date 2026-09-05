import { NextResponse } from "next/server";

import { exportAdminCustomerSegments } from "@/modules/customers/server/queries";
import { parseCustomerSegmentQuery } from "@/modules/customers/segments/query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "operational" ? "operational" : "marketing";
  const result = await exportAdminCustomerSegments(parseCustomerSegmentQuery(url.searchParams), mode);

  if (!result.success) {
    const status = result.error.code === "UNAUTHORIZED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: result.error.message }, { status });
  }

  return new Response(result.data, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customer-audience.csv"',
      "Cache-Control": "no-store",
    },
  });
}

