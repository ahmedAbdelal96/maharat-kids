import "server-only";

import { AppError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import { SHIPPING_PERMISSIONS } from "../constants";
import type { SettlementBatchInput, TransitionShipmentInput } from "../schema";
import type { ShippingRepository } from "../infrastructure/repository";
import type { ShipmentDetails, ShippingCompany, ShippingCompanyDetail, ShippingCompanyDetailQuery, ShippingOverview, SettlementSummary } from "../types";

function operationError(error: unknown) {
  const code = error instanceof Error ? error.message : "SHIPPING_OPERATION_FAILED";
  const messages: Record<string, string> = {
    ORDER_NOT_FOUND: "The order does not exist.",
    COMPANY_NOT_FOUND: "The shipping company does not exist.",
    COMPANY_INACTIVE: "Activate this shipping company before assigning it.",
    COMPANY_HAS_HISTORY: "This company has history and cannot be deleted. Deactivate it instead.",
    SHIPMENT_NOT_FOUND: "This order does not have a shipment record yet.",
    SHIPMENT_ALREADY_HANDED_OVER: "The carrier cannot be changed after handover.",
    SHIPPING_COMPANY_REQUIRED: "Assign a shipping company before handover.",
    INVALID_SHIPMENT_TRANSITION: "That shipment status transition is not allowed.",
    FAILURE_REASON_REQUIRED: "Select a delivery failure reason.",
    DUPLICATE_SETTLEMENT_ORDER: "An order cannot be included twice in one settlement.",
    INELIGIBLE_SETTLEMENT_ORDER: "One or more selected orders are no longer eligible for settlement.",
    DUPLICATE_RETURN_ORDER: "A return cannot be selected twice.",
    INELIGIBLE_RETURN_ORDER: "One or more selected returns are no longer eligible.",
  };
  return new AppError(code, messages[code] ?? "The shipping operation could not be completed.", { cause: error });
}

export class ShippingService {
  constructor(private readonly repository: ShippingRepository, private readonly authorization: AuthorizationService) {}

  async getOverview(userId: UserId): Promise<Result<ShippingOverview, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.view);
    if (!allowed.success) return failure(allowed.error);
    try { return success(await this.repository.listOverview()); } catch (error) { return failure(operationError(error)); }
  }

  async getCompanyDetail(userId: UserId, companyId: string, query?: ShippingCompanyDetailQuery): Promise<Result<ShippingCompanyDetail, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.view);
    if (!allowed.success) return failure(allowed.error);
    try { const detail = await this.repository.findCompanyDetail(companyId, query); return detail ? success(detail) : failure(new NotFoundError("SHIPPING_COMPANY", "The shipping company does not exist.")); } catch (error) { return failure(operationError(error)); }
  }

  async getCompanies(userId: UserId): Promise<Result<ShippingCompany[], AppError>> {
    const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.view);
    if (!allowed.success) return failure(allowed.error);
    try { return success(await this.repository.findCompanies()); } catch (error) { return failure(operationError(error)); }
  }

  async getShipmentForOrder(userId: UserId, orderId: string): Promise<Result<ShipmentDetails | null, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.view);
    if (!allowed.success) return failure(allowed.error);
    try { return success(await this.repository.findShipmentByOrderId(orderId)); } catch (error) { return failure(operationError(error)); }
  }

  async createCompany(userId: UserId, input: { name: string; phone?: string; contactPerson?: string; notes?: string }) { return this.mutate(userId, () => this.repository.createCompany(input)); }
  async updateCompany(userId: UserId, id: string, input: { name: string; phone?: string; contactPerson?: string; notes?: string; isActive: boolean }) { return this.mutate(userId, () => this.repository.updateCompany(id, input)); }
  async deleteCompany(userId: UserId, id: string): Promise<Result<true, AppError>> { const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.update); if (!allowed.success) return failure(allowed.error); try { await this.repository.deleteCompany(id); return success(true); } catch (error) { return failure(operationError(error)); } }
  async assignShipment(userId: UserId, orderId: string, companyId: string, trackingNumber?: string) { return this.mutate(userId, () => this.repository.assignShipment(orderId, companyId, trackingNumber)); }
  async transitionShipment(userId: UserId, input: TransitionShipmentInput) { return this.mutate(userId, () => this.repository.transitionShipment(input.orderId, input.status, userId, input.failureReason, input.note)); }
  async receiveSettlement(userId: UserId, input: SettlementBatchInput): Promise<Result<SettlementSummary, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.settle"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.receiveSettlement(input, userId)); } catch (error) { return failure(operationError(error)); } }
  async receiveReturns(userId: UserId, companyId: string, orderIds: string[]) { return this.mutate(userId, () => this.repository.receiveReturns(companyId, orderIds, userId)); }

  private async mutate<T>(userId: UserId, operation: () => Promise<T>): Promise<Result<T, AppError>> {
    const allowed = await this.authorization.requirePermission(userId, SHIPPING_PERMISSIONS.update);
    if (!allowed.success) return failure(allowed.error);
    try { return success(await operation()); } catch (error) { return failure(operationError(error)); }
  }
}
