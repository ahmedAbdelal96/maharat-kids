import "server-only";

import { AppError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { AuditMutationContext } from "@/modules/audit/types";
import { createNotificationService, type NotificationService } from "@/modules/notifications/domain/service";
import type { AdminReturnPage, CustomerReturnPage, ReturnDetails } from "../types";
import type { ApproveReturnInput, PrismaReturnRepository, ReceiveReturnInput, RequestReturnInput } from "../infrastructure/repository";

function mapError(error: unknown): AppError {
  const code = error instanceof Error ? error.message : "RETURN_OPERATION_FAILED";
  const messages: Record<string, string> = {
    ORDER_NOT_FOUND: "The order could not be found.",
    ORDER_NOT_ELIGIBLE: "Only delivered orders can be returned.",
    RETURNS_DISABLED: "Returns are not currently available.",
    RETURN_WINDOW_CLOSED: "The return window for this order has closed.",
    RETURN_QUANTITY_INVALID: "One or more requested quantities are no longer available for return.",
    RETURN_ITEMS_REQUIRED: "Select at least one item to return.",
    PROMOTION_GIFT_RETURN_REQUIRED: "Please include the free gift that is no longer covered by the promotion.",
    RETURN_NOT_FOUND: "The return request could not be found.",
    RETURN_TRANSITION_INVALID: "This return cannot be moved to that status.",
    APPROVED_QUANTITY_INVALID: "Approved quantities must not exceed requested quantities.",
    RECEIVED_QUANTITY_INVALID: "Received and restock quantities are not valid.",
    REFUND_NOT_READY: "This refund is not ready to be completed.",
  };
  return new AppError(code, messages[code] ?? "The return operation could not be completed.", { cause: error });
}

export class ReturnService {
  constructor(private readonly repository: PrismaReturnRepository, private readonly authorization: AuthorizationService, private readonly notifications: NotificationService = createNotificationService()) {}

  async getCustomerReturns(customerId: UserId): Promise<Result<CustomerReturnPage, AppError>> { try { return success(await this.repository.findCustomerPage(customerId)); } catch (error) { return failure(mapError(error)); } }

  async getEligibleOrder(customerId: UserId, orderNumber: string): Promise<Result<Awaited<ReturnType<PrismaReturnRepository["findCustomerEligibleOrder"]>>, AppError>> { try { return success(await this.repository.findCustomerEligibleOrder(customerId, orderNumber)); } catch (error) { return failure(mapError(error)); } }

  async getCustomerReturn(customerId: UserId, id: string): Promise<Result<ReturnDetails, AppError>> { try { const result = await this.repository.findCustomerDetails(customerId, id); return result ? success(result) : failure(new NotFoundError("RETURN", "Return request does not exist.")); } catch (error) { return failure(mapError(error)); } }

  async request(customerId: UserId, input: Omit<RequestReturnInput, "customerId">): Promise<Result<ReturnDetails, AppError>> { try { return success(await this.repository.createRequest({ ...input, customerId })); } catch (error) { return failure(mapError(error)); } }

  async cancel(customerId: UserId, id: string): Promise<Result<ReturnDetails, AppError>> { try { return success(await this.repository.cancelCustomerRequest(customerId, id)); } catch (error) { return failure(mapError(error)); } }

  async getAdminPage(userId: UserId, input: { page: number; status: string; search?: string; refundPending?: boolean }): Promise<Result<AdminReturnPage, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.view"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.findAdminPage(input)); } catch (error) { return failure(mapError(error)); } }

  async getAdminDetails(userId: UserId, id: string): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.view"); if (!allowed.success) return failure(allowed.error); try { const result = await this.repository.findAdminDetails(id); return result ? success(result) : failure(new NotFoundError("RETURN", "Return request does not exist.")); } catch (error) { return failure(mapError(error)); } }

  async approve(userId: UserId, input: ApproveReturnInput, audit?: AuditMutationContext): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.manage"); if (!allowed.success) return failure(allowed.error); try { const result = await this.repository.approve(input, userId, audit); await this.notify(result, "APPROVED"); return success(result); } catch (error) { return failure(mapError(error)); } }

  async reject(userId: UserId, id: string, note: string, audit?: AuditMutationContext): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.manage"); if (!allowed.success) return failure(allowed.error); try { const result = await this.repository.reject(id, userId, note, audit); await this.notify(result, "REJECTED", note); return success(result); } catch (error) { return failure(mapError(error)); } }

  async startReturning(userId: UserId, id: string, audit?: AuditMutationContext): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.manage"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.startReturn(id, userId, audit)); } catch (error) { return failure(mapError(error)); } }

  async receive(userId: UserId, input: ReceiveReturnInput, audit?: AuditMutationContext): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "returns.manage"); if (!allowed.success) return failure(allowed.error); try { const result = await this.repository.receive(input, userId, audit); await this.notify(result, "RECEIVED"); return success(result); } catch (error) { return failure(mapError(error)); } }

  async completeRefund(userId: UserId, id: string, method: Parameters<PrismaReturnRepository["completeRefund"]>[2], reference?: string, note?: string, audit?: AuditMutationContext): Promise<Result<ReturnDetails, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.refund"); if (!allowed.success) return failure(allowed.error); try { const result = await this.repository.completeRefund(id, userId, method, reference, note, audit); await this.notify(result, "REFUND_COMPLETED"); return success(result); } catch (error) { return failure(mapError(error)); } }

  private async notify(result: ReturnDetails, status: "APPROVED" | "REJECTED" | "RECEIVED" | "REFUND_COMPLETED", note?: string) { const notification = await this.notifications.createReturnNotification(result.customerId as UserId, result.id, result.returnNumber, status, note); if (!notification.success) return; }
}
