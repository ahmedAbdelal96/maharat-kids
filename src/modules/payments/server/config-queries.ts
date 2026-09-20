import "server-only";

import { getPrismaClient } from "@/database/prisma";
import { resolveMarket } from "@/modules/market/server/resolver";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";

const db = () => getPrismaClient();
const auth = () => new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository());

export async function getPaymentMethodsForActiveMarket() {
  const { market } = await resolveMarket();
  return db().paymentMethod.findMany({ where: { enabled: true, marketConfigs: { some: { market, enabled: true } } }, include: { marketConfigs: { where: { market } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function getAdminPaymentConfiguration() {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return actor;
  const allowed = await auth().requirePermission(actor.data.user.id, "payments.settings");
  if (!allowed.success) return allowed;
  const [methods, accounts] = await Promise.all([
    db().paymentMethod.findMany({ include: { marketConfigs: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db().bankTransferAccount.findMany({ orderBy: [{ market: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }] }),
  ]);
  return { success: true as const, data: { methods, accounts, markets: ["SAUDI_ARABIA", "EGYPT"] as const } };
}
