import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { ShippingService } from "../domain/service";
import { PrismaShippingRepository } from "../infrastructure/repository";

function service() { return new ShippingService(new PrismaShippingRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }

export async function getShippingOverview() {
  const actor = await requireAuthenticatedUser();
  return actor.success ? service().getOverview(actor.data.user.id) : failure(actor.error);
}

export async function getShippingCompanyDetail(companyId: string, query?: import("../types").ShippingCompanyDetailQuery) {
  const actor = await requireAuthenticatedUser();
  return actor.success ? service().getCompanyDetail(actor.data.user.id, companyId, query) : failure(actor.error);
}

export async function getShippingCompanies() {
  const actor = await requireAuthenticatedUser();
  return actor.success ? service().getCompanies(actor.data.user.id) : failure(actor.error);
}
