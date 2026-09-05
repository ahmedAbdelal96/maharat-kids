import "server-only";

import type { PrismaClient } from "@prisma/client";

export type ApprovedRatingSummary = {
  average: number;
  count: number;
};

/** One database aggregate for every product in a collection. */
export async function getApprovedRatingSummaries(
  db: PrismaClient,
  productIds: string[],
): Promise<Map<string, ApprovedRatingSummary>> {
  if (productIds.length === 0) return new Map();

  const rows = await db.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "APPROVED" },
    _count: { _all: true },
    _avg: { rating: true },
  });

  return new Map(rows.map((row) => [
    row.productId,
    {
      average: Math.round((row._avg.rating ?? 0) * 10) / 10,
      count: row._count._all,
    },
  ]));
}
