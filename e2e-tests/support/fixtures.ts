import type { PrismaClient } from "@prisma/client";

/**
 * Browser tests use the same disposable database as the local app, but never
 * rely on business seed data. The fixture owns the carrier it creates and
 * removes it when the test finishes.
 */
export function getE2EAdminCredentials(): { email: string; password: string } {
  const email = (process.env.MK_E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = process.env.MK_E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("MK_E2E_ADMIN_EMAIL/MK_E2E_ADMIN_PASSWORD or SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD are required for browser tests.");
  }
  return { email, password };
}

export async function createE2EShippingFixture(db: PrismaClient) {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Make the fixture the only checkout carrier in this disposable run. This
  // also neutralizes stale rows left by an interrupted legacy test.
  await db.shippingCarrierMarketConfig.updateMany({
    where: { market: { in: ["SAUDI_ARABIA", "EGYPT"] }, isCheckoutCarrier: true },
    data: { isCheckoutCarrier: false },
  });
  const company = await db.shippingCompany.create({
    data: {
      code: `mk-e2e-test-express-${suffix}`,
      name: "Test Express",
      nameAr: "شركة الاختبار",
      nameEn: "Test Express",
      isActive: true,
      marketConfigs: {
        create: [
          { market: "SAUDI_ARABIA", enabled: true, isCheckoutCarrier: true, rate: "25.00" },
          { market: "EGYPT", enabled: true, isCheckoutCarrier: true, rate: "80.00" },
        ],
      },
    },
  });

  return {
    id: company.id,
    async cleanup() {
      await db.shippingCarrierMarketConfig.deleteMany({ where: { shippingCompanyId: company.id } });
      await db.shippingCompany.delete({ where: { id: company.id } }).catch(() => undefined);
    },
  };
}
