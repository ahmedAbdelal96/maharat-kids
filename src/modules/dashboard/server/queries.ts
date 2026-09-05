import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { DashboardService } from "../domain/service";
import { PrismaDashboardRepository } from "../infrastructure/repository";

function service() {
  return new DashboardService(
    new PrismaDashboardRepository(),
    new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()),
  );
}

export async function getDashboardOverview() {
  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  const settings = await getPublicStoreSettings();

  if (!settings.success) {
    return failure(settings.error);
  }

  return service().getOverview(actor.data.user.id, settings.data.currency);
}
