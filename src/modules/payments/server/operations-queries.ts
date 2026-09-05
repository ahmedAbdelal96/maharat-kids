import "server-only";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { PaymentOperationsService } from "../domain/operations-service";
import { PrismaPaymentOperationsRepository } from "../infrastructure/operations-repository";

function service() { return new PaymentOperationsService(new PrismaPaymentOperationsRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function getPaymentVerificationQueue() { const actor = await requireAuthenticatedUser(); return actor.success ? service().getVerificationQueue(actor.data.user.id) : failure(actor.error); }
export async function getPendingPaymentSettlements() { const actor = await requireAuthenticatedUser(); return actor.success ? service().getPendingSettlements(actor.data.user.id) : failure(actor.error); }
