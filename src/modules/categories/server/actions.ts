'use server';

import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { createCategorySchema, deleteCategorySchema, updateCategorySchema } from "../schema";
import { CategoryService } from "../domain/service";
import { PrismaCategoryRepository } from "../infrastructure/repository";
import { createMediaService } from "@/modules/media/server/service";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function service() { return new CategoryService(new PrismaCategoryRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()), createMediaService()); }
export async function createCategory(input: unknown) { const parsed = createCategorySchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the category details.", { issues: parsed.error.issues })); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().create(actor.data.user.id, parsed.data); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.CATEGORY_CREATED, entityType: AUDIT_ENTITY_TYPES.CATEGORY, entityId: result.data.id, entityLabel: result.data.name }); revalidatePath("/admin/categories"); } return result; }
export async function updateCategory(input: unknown) { const parsed = updateCategorySchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review the category details.", { issues: parsed.error.issues })); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().update(actor.data.user.id, parsed.data); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.CATEGORY_UPDATED, entityType: AUDIT_ENTITY_TYPES.CATEGORY, entityId: result.data.id, entityLabel: result.data.name }); revalidatePath("/admin/categories"); revalidatePath("/categories", "layout"); } return result; }
export async function deleteCategory(input: unknown) { const parsed = deleteCategorySchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please select a valid category.")); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const result = await service().remove(actor.data.user.id, parsed.data.id); if (result.success) { await writeAdminAudit(actor.data, { action: AUDIT_ACTIONS.CATEGORY_DELETED, entityType: AUDIT_ENTITY_TYPES.CATEGORY, entityId: result.data.id, entityLabel: result.data.name }); revalidatePath("/admin/categories"); revalidatePath("/categories", "layout"); } return result; }
