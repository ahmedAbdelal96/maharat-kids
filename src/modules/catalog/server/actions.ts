'use server';
import "server-only";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { failure, success } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { taxonomyInputSchema, taxonomyKindSchema, productEducationSchema } from "../schema";
import { CatalogRepository } from "./repository";
import type { CatalogTaxonomyKind } from "../types";
import type { UserId } from "@/modules/identity/types";
const auth = () => new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository());
async function guard(permission: string) { const actor = await requireAuthenticatedUser(); if (!actor.success) return actor; const allowed = await auth().requirePermission(actor.data.user.id as UserId, permission); return allowed.success ? actor : allowed; }
export async function createCatalogTaxonomy(kind: unknown, input: unknown) { const parsedKind = taxonomyKindSchema.safeParse(kind); const parsed = taxonomyInputSchema.safeParse(input); if (!parsedKind.success || !parsed.success) return failure(new ValidationError("Invalid taxonomy details.")); const actor = await guard("catalog.taxonomy.manage"); if (!actor.success) return failure(actor.error); try { return success(await new CatalogRepository().createTaxonomy(parsedKind.data as CatalogTaxonomyKind, parsed.data)); } catch (error) { return failure(new ValidationError(error instanceof Error ? error.message : "Taxonomy could not be created.")); } }
export async function updateCatalogTaxonomy(kind: unknown, id: string, input: unknown) { const parsedKind = taxonomyKindSchema.safeParse(kind); const parsed = taxonomyInputSchema.partial().safeParse(input); if (!parsedKind.success || !parsed.success || !id) return failure(new ValidationError("Invalid taxonomy details.")); const actor = await guard("catalog.taxonomy.manage"); if (!actor.success) return failure(actor.error); return success(await new CatalogRepository().updateTaxonomy(parsedKind.data as CatalogTaxonomyKind, id, parsed.data)); }
export async function archiveCatalogTaxonomy(kind: unknown, id: string) { const parsed = taxonomyKindSchema.safeParse(kind); if (!parsed.success || !id) return failure(new ValidationError("Invalid taxonomy.")); const actor = await guard("catalog.taxonomy.manage"); if (!actor.success) return failure(actor.error); return success(await new CatalogRepository().deleteOrDisableTaxonomy(parsed.data as CatalogTaxonomyKind, id)); }
export async function saveProductEducation(productId: string, input: unknown) { const parsed = productEducationSchema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Please review educational metadata.")); const actor = await guard("products.update"); if (!actor.success) return failure(actor.error); try { return success(await new CatalogRepository().saveProductEducation(productId, parsed.data)); } catch (error) { return failure(new ValidationError(error instanceof Error ? error.message : "Educational metadata could not be saved.")); } }
