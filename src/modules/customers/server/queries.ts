import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { createPasswordHasher } from "@/modules/auth/providers/password-hasher";

import { CustomerService } from "../domain/service";
import { PrismaCustomerRepository } from "../infrastructure/repository";
import { PrismaCustomerIntelligenceRepository } from "../intelligence/repository";
import { CustomerIntelligenceService } from "../intelligence/service";
import type { CustomerListQuery } from "../intelligence/types";
import { CustomerSegmentsService } from "../segments/service";
import { PrismaCustomerSegmentsRepository } from "../segments/repository";
import type { CustomerExportMode } from "../segments/service";
import type { CustomerSegmentQuery } from "../segments/types";

function createCustomerIntelligenceService() {
  return new CustomerIntelligenceService(
    new PrismaCustomerIntelligenceRepository(),
    new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()),
  );
}

function createDefaultCustomerService(): CustomerService {
  return new CustomerService(
    new PrismaCustomerRepository(),
    createPasswordHasher(),
    new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()),
  );
}

export function createCustomerSegmentsService() {
  return new CustomerSegmentsService(
    new PrismaCustomerSegmentsRepository(),
    new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()),
  );
}

export async function getCustomerAccountData() {
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  return createDefaultCustomerService().getAccount(actor.data.user.id);
}

export async function getAdminCustomersPageData(query: CustomerListQuery = {}) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createCustomerIntelligenceService().getList(actor.data, query);
}

export async function getAdminCustomerIntelligencePageData(customerId: string, orderPage = 1) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createCustomerIntelligenceService().get360(actor.data, customerId, orderPage);
}

export async function getAdminCustomerDetails(customerId: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultCustomerService().getAdminCustomer(actor.data, customerId);
}

export async function getAdminCustomerSegmentsPageData(query: CustomerSegmentQuery) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createCustomerSegmentsService().getPage(actor.data, query);
}

export async function exportAdminCustomerSegments(query: CustomerSegmentQuery, mode: CustomerExportMode) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createCustomerSegmentsService().exportCsv(actor.data, query, mode);
}
