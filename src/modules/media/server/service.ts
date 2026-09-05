import "server-only";

import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";
import { MediaService } from "../domain/service";
import { PrismaMediaRepository } from "../infrastructure/repository";
import { LocalStorageProvider } from "../infrastructure/storage-provider";

export function createMediaService() {
  return new MediaService(
    new PrismaMediaRepository(),
    new LocalStorageProvider(),
    new AuthorizationService(
      new PrismaPermissionRepository(),
      new PrismaUserRepository(),
    ),
  );
}
