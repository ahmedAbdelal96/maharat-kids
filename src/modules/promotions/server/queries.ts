import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";
import { PrismaStoreSettingRepository } from "@/modules/store/infrastructure/repository";
import { PromotionService } from "../domain/service";
import { PrismaPromotionRepository } from "../infrastructure/repository";
import type { PromotionQuery } from "../types";

export function createDefaultPromotionService(): PromotionService {
  return new PromotionService(
    new PrismaPromotionRepository(),
    new PrismaStoreSettingRepository(),
    new AuthorizationService(
      new PrismaPermissionRepository(),
      new PrismaUserRepository(),
    ),
  );
}

export async function getAdminPromotions(query?: PromotionQuery) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultPromotionService().getAdminPromotions(actor.data.user.id, query);
}

export async function getAdminPromotion(id: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultPromotionService().getAdminPromotion(actor.data.user.id, id);
}

export async function getPromotionLimitsUsage(excludeId?: string) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createDefaultPromotionService().getPromotionLimitsUsage(actor.data.user.id, excludeId);
}

export async function getPublicHeroPromotions() {
  return createDefaultPromotionService().getPublicHeroPromotions();
}

export async function getPublicOffers() {
  return createDefaultPromotionService().getPublicOffers();
}

export async function getPublicOffer(slug: string) {
  return createDefaultPromotionService().getPublicOffer(slug);
}

export async function getParticipatingPromotionForProduct(productId: string) {
  return createDefaultPromotionService().getParticipatingPromotionForProduct(productId);
}
