import "server-only";

import { failure } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { ProductService } from "../domain/service";
import { PrismaProductRepository } from "../infrastructure/repository";
import { productQuerySchema } from "../schema";

function service() { return new ProductService(new PrismaProductRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function getPublicProducts(input: unknown = {}) { const parsed = productQuerySchema.safeParse(input); return parsed.success ? service().findPublic(parsed.data) : failure(new ValidationError("Invalid product query.")); }
export async function getPublicProduct(slug: string) { return service().findPublicBySlug(slug); }
export async function getAdminProducts(input: unknown = {}) { const parsed = productQuerySchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Invalid product query.")); const actor = await requireAuthenticatedUser(); return actor.success ? service().findAdmin(actor.data.user.id, parsed.data) : failure(actor.error); }
