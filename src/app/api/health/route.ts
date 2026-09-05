import { NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { getRequestId, logUnexpectedError } from "@/server/observability";

export async function GET() {
  const requestId = await getRequestId();
  try {
    await getDb().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", requestId });
  } catch (error) {
    const errorId = logUnexpectedError({ event: "Health check failed", error, requestId, route: "/api/health" });
    return NextResponse.json({ status: "error", requestId, errorId }, { status: 503 });
  }
}
