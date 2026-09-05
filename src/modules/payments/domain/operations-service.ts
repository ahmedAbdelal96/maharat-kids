import "server-only";

import { AppError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import { OrderService } from "@/modules/orders/domain/service";
import { PrismaOrderRepository } from "@/modules/orders/infrastructure/repository";
import type { OrderDetails } from "@/modules/orders/types";
import type { PaymentOperationsRepository } from "../infrastructure/operations-repository";
import type { PaymentOperationOrder, PendingSettlement } from "../types-operations";

function operationError(error: unknown) { const code = error instanceof Error ? error.message : "PAYMENT_OPERATION_FAILED"; return new AppError(code, code === "SETTLEMENT_NOT_FOUND" ? "The settlement does not exist." : "The payment operation could not be completed.", { cause: error }); }

export class PaymentOperationsService {
  constructor(private readonly repository: PaymentOperationsRepository, private readonly authorization: AuthorizationService) {}
  async getVerificationQueue(userId: UserId): Promise<Result<PaymentOperationOrder[], AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.view"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.findVerificationQueue()); } catch (error) { return failure(operationError(error)); } }
  async getPendingSettlements(userId: UserId): Promise<Result<PendingSettlement[], AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.view"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.findPendingSettlements()); } catch (error) { return failure(operationError(error)); } }
  async verify(userId: UserId, orderId: string, status: "PAID" | "FAILED", note?: string): Promise<Result<OrderDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.verify"); if (!allowed.success) return failure(allowed.error); const service = new OrderService(new PrismaOrderRepository(), this.authorization); const result = await service.updatePaymentStatus(userId, orderId, status, note); return result; }
  async settle(userId: UserId, orderId: string, note?: string): Promise<Result<PendingSettlement, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.settle"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.settle(orderId, userId, note)); } catch (error) { return failure(operationError(error)); } }
}
