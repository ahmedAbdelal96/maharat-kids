import "server-only";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { PaymentMethodService } from "../domain/service";
import { PrismaPaymentMethodRepository } from "../infrastructure/repository";

function service() { return new PaymentMethodService(new PrismaPaymentMethodRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function getAvailablePaymentMethods() { return service().getAvailable(); }
export async function getAdminPaymentMethods() { const actor = await requireAuthenticatedUser(); return actor.success ? service().getAdmin(actor.data.user.id) : failure(actor.error); }
