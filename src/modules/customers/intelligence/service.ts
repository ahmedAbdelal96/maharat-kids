import "server-only";

import { AppError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { PermissionKey } from "@/modules/identity/types";

import type { CustomerIntelligenceRepository } from "./repository";
import type { AdminCustomer360, AdminCustomerListPage, CustomerListQuery } from "./types";

export class CustomerIntelligenceService {
  constructor(private readonly repository: CustomerIntelligenceRepository, private readonly authorization: AuthorizationService) {}

  private async authorize(actor: AuthenticatedUser) {
    return this.authorization.requirePermission(actor.user.id, "customers.view" as PermissionKey);
  }

  async getList(actor: AuthenticatedUser, query: CustomerListQuery): Promise<Result<AdminCustomerListPage & { canUpdate: boolean }, AppError>> {
    const allowed = await this.authorize(actor);
    if (!allowed.success) return failure(allowed.error);
    try {
      return success({ ...(await this.repository.findCustomerList(query)), canUpdate: actor.permissions.includes("customers.update" as PermissionKey) });
    } catch {
      return failure(new AppError("CUSTOMER_INTELLIGENCE_FAILED", "Customer intelligence could not be loaded."));
    }
  }

  async get360(actor: AuthenticatedUser, customerId: string, orderPage: number): Promise<Result<AdminCustomer360, AppError>> {
    const allowed = await this.authorize(actor);
    if (!allowed.success) return failure(allowed.error);
    try {
      const customer = await this.repository.findCustomer360(customerId as UserId, orderPage);
      if (!customer) return failure(new NotFoundError("CUSTOMER", "Customer does not exist."));
      return success({ ...customer, canUpdate: actor.permissions.includes("customers.update" as PermissionKey) });
    } catch {
      return failure(new AppError("CUSTOMER_INTELLIGENCE_FAILED", "Customer intelligence could not be loaded."));
    }
  }
}
