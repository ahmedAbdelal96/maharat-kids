import "server-only";

import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { ReturnService } from "../domain/service";
import { PrismaReturnRepository } from "../infrastructure/repository";

export function createReturnService() {
  return new ReturnService(new PrismaReturnRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()));
}
