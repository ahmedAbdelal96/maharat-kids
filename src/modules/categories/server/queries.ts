import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { CategoryService } from "../domain/service";
import { PrismaCategoryRepository } from "../infrastructure/repository";

function service() { return new CategoryService(new PrismaCategoryRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function getPublicCategories() { return service().findPublicCategories(); }
export async function getPublicCategory(slug: string) { return service().findPublicCategory(slug); }
export async function getAdminCategories() { const actor = await requireAuthenticatedUser(); return actor.success ? service().findAdminCategories(actor.data.user.id) : failure(actor.error); }
