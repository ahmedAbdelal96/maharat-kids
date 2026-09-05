import "server-only";

import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { normalizeEmail } from "@/modules/identity/domain/rules";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { AuthorizationService, PasswordHasher } from "@/modules/identity/domain/services";

import type {
  AddressInput,
  AdminCustomer,
  AdminCustomerDetails,
  ChangeCustomerPasswordInput,
  CustomerAccountData,
  CustomerProfileInput,
} from "../types";
import type { CustomerRepository } from "../infrastructure/repository";

function operationError(operation: string, cause: unknown): AppError {
  return new AppError("CUSTOMER_OPERATION_FAILED", `Customer operation failed: ${operation}.`, { cause });
}

export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authorization: AuthorizationService,
  ) {}

  async getAccount(userId: string): Promise<Result<CustomerAccountData, AppError>> {
    try {
      const profile = await this.repository.findCustomerProfile(userId as never);
      if (!profile) return failure(new NotFoundError("CUSTOMER", "Customer account does not exist."));
      const [addresses, password] = await Promise.all([
        this.repository.findAddresses(userId as never),
        this.repository.findCustomerWithPassword(userId as never),
      ]);
      return success({ profile, addresses, hasLocalPassword: !password?.passwordHash.startsWith("external-only$") });
    } catch (error) {
      return failure(operationError("load account", error));
    }
  }

  async updateProfile(userId: string, input: CustomerProfileInput) {
    try {
      const email = normalizeEmail(input.email);
      const existing = await this.repository.findUserByEmail(email, userId as never);
      if (existing) return failure(new AppError("EMAIL_ALREADY_IN_USE", "This email is already used by another account."));
      return success(await this.repository.updateProfile(userId as never, { ...input, email }));
    } catch (error) {
      return failure(operationError("update profile", error));
    }
  }

  async createAddress(userId: string, input: AddressInput) {
    try { return success(await this.repository.createAddress(userId as never, input)); }
    catch (error) { return failure(operationError("create address", error)); }
  }

  async updateAddress(userId: string, addressId: string, input: AddressInput) {
    try { return success(await this.repository.updateAddress(userId as never, addressId, input)); }
    catch (error) {
      if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") return failure(new NotFoundError("ADDRESS", "Address does not exist."));
      return failure(operationError("update address", error));
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<Result<true, AppError>> {
    try {
      const deleted = await this.repository.deleteAddress(userId as never, addressId);
      return deleted ? success(true) : failure(new NotFoundError("ADDRESS", "Address does not exist."));
    } catch (error) { return failure(operationError("delete address", error)); }
  }

  async changePassword(userId: string, sessionId: string, input: ChangeCustomerPasswordInput): Promise<Result<true, AppError>> {
    try {
      const customer = await this.repository.findCustomerWithPassword(userId as never);
      if (!customer) return failure(new NotFoundError("CUSTOMER", "Customer account does not exist."));
      if (customer.passwordHash.startsWith("external-only$")) return failure(new ForbiddenError("This account uses Google Sign-In and has no local password."));
      if (!(await this.passwordHasher.verify(input.currentPassword, customer.passwordHash))) return failure(new AppError("CURRENT_PASSWORD_INVALID", "The current password is incorrect."));
      await this.repository.updatePasswordAndDeleteOtherSessions(userId as never, await this.passwordHasher.hash(input.newPassword), sessionId);
      return success(true);
    } catch (error) { return failure(operationError("change password", error)); }
  }

  private authorize(actor: AuthenticatedUser, permission: string) {
    return this.authorization.requirePermission(actor.user.id, permission);
  }

  async getAdminCustomers(actor: AuthenticatedUser): Promise<Result<AdminCustomer[], AppError>> {
    const allowed = await this.authorize(actor, "customers.view");
    if (!allowed.success) return failure(allowed.error);
    try { return success(await this.repository.findAdminCustomers()); }
    catch (error) { return failure(operationError("list customers", error)); }
  }

  async getAdminCustomer(actor: AuthenticatedUser, customerId: string): Promise<Result<AdminCustomerDetails, AppError>> {
    const allowed = await this.authorize(actor, "customers.view");
    if (!allowed.success) return failure(allowed.error);
    try {
      const customer = await this.repository.findAdminCustomerById(customerId as never);
      return customer ? success(customer) : failure(new NotFoundError("CUSTOMER", "Customer does not exist."));
    } catch (error) { return failure(operationError("load customer", error)); }
  }

  async updateAdminCustomerStatus(actor: AuthenticatedUser, customerId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): Promise<Result<AdminCustomer, AppError>> {
    const allowed = await this.authorize(actor, "customers.update");
    if (!allowed.success) return failure(allowed.error);
    try {
      const customer = await this.repository.findAdminCustomerById(customerId as never);
      if (!customer) return failure(new NotFoundError("CUSTOMER", "Customer does not exist."));
      return success(await this.repository.updateCustomerStatus(customerId as never, status));
    } catch (error) { return failure(operationError("update customer status", error)); }
  }
}
