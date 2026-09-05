import "server-only";

import { AppError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import { DASHBOARD_PERMISSION } from "../constants";
import type { DashboardData } from "../types";
import type { DashboardRepository } from "../infrastructure/repository";

function operationError(cause: unknown) {
  return new AppError("DASHBOARD_OPERATION_FAILED", "The dashboard data could not be loaded.", { cause });
}

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async getOverview(userId: UserId, currency: string): Promise<Result<DashboardData, AppError>> {
    const authorized = await this.authorization.requirePermission(userId, DASHBOARD_PERMISSION);

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      return success(await this.repository.getOverview(currency));
    } catch (error) {
      return failure(operationError(error));
    }
  }
}
