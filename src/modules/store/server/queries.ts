import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";
import type { UserId } from "@/modules/identity/types";

import { StoreSettingService } from "../domain/service";
import { PrismaStoreSettingRepository } from "../infrastructure/repository";

function createDefaultStoreSettingService(): StoreSettingService {
  return new StoreSettingService(
    new PrismaStoreSettingRepository(),
    new AuthorizationService(
      new PrismaPermissionRepository(),
      new PrismaUserRepository(),
    ),
  );
}

export async function getAdminStoreSettings() {
  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  return createDefaultStoreSettingService().getStoreSettings(actor.data.user.id);
}

export async function getPublicStoreSettings() {
  return createDefaultStoreSettingService().getPublicStoreSettings();
}

export function createStoreQueries(service: StoreSettingService, actorUserId: UserId) {
  return {
    getSetting: (key: string) => service.getSetting(actorUserId, key),
    getAllSettings: () => service.getAllSettings(actorUserId),
  };
}
