import "server-only";

import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import { getPaymentGateway } from "../providers/gateway";
import type { PaymentMethodRepository } from "../infrastructure/repository";
import type { CreatePaymentMethodInput, UpdatePaymentMethodInput } from "../schema";
import type { PaymentMethod } from "../types";
import { resolveMarket } from "@/modules/market/server/resolver";

export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  if (!method.enabled) return false;
  if (method.type === "CASH_ON_DELIVERY") return true;
  if (method.type === "BANK_TRANSFER" || method.type === "MANUAL_TRANSFER") return Boolean(method.bankAccount);
  return Boolean(method.providerKey && getPaymentGateway(method.providerKey));
}

export class PaymentMethodService {
  constructor(private readonly repository: PaymentMethodRepository, private readonly authorization: AuthorizationService) {}
  async getAvailable(): Promise<Result<PaymentMethod[], AppError>> { try { const { market } = await resolveMarket(); return success((await this.repository.findEnabledForMarket(market)).filter(isPaymentMethodAvailable)); } catch (error) { return failure(new AppError("PAYMENT_METHOD_OPERATION_FAILED", "Payment methods are unavailable.", { cause: error })); } }
  async getAdmin(userId: UserId): Promise<Result<PaymentMethod[], AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.view"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.findAll()); } catch (error) { return failure(new AppError("PAYMENT_METHOD_OPERATION_FAILED", "Payment methods are unavailable.", { cause: error })); } }
  async create(userId: UserId, input: CreatePaymentMethodInput): Promise<Result<PaymentMethod, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.settings"); if (!allowed.success) return failure(allowed.error); try { return success(await this.repository.create(input)); } catch (error) { return failure(new AppError("PAYMENT_METHOD_OPERATION_FAILED", "Payment method could not be created.", { cause: error })); } }
  async update(userId: UserId, input: UpdatePaymentMethodInput): Promise<Result<PaymentMethod, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.settings"); if (!allowed.success) return failure(allowed.error); const current = await this.repository.findById(input.id); if (!current) return failure(new NotFoundError("PAYMENT_METHOD", "Payment method does not exist.")); if (current.isSystem && input.type !== "CASH_ON_DELIVERY") return failure(new ForbiddenError("The protected Cash on Delivery method cannot change type.")); try { return success(await this.repository.update(input.id, input)); } catch (error) { return failure(new AppError("PAYMENT_METHOD_OPERATION_FAILED", "Payment method could not be updated.", { cause: error })); } }
  async delete(userId: UserId, id: string): Promise<Result<true, AppError>> { const allowed = await this.authorization.requirePermission(userId, "payments.settings"); if (!allowed.success) return failure(allowed.error); const current = await this.repository.findById(id); if (!current) return failure(new NotFoundError("PAYMENT_METHOD", "Payment method does not exist.")); if (current.isSystem) return failure(new ForbiddenError("The protected Cash on Delivery method cannot be deleted.")); try { await this.repository.delete(id); return success(true); } catch (error) { return failure(new AppError("PAYMENT_METHOD_OPERATION_FAILED", "Payment method could not be deleted.", { cause: error })); } }
}
