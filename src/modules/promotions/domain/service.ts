import "server-only";

import { AppError, NotFoundError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { generateUniqueSlug } from "@/lib/slug";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { StoreSettingRepository } from "@/modules/store/infrastructure/repository";
import { toStoreSettings } from "@/modules/store/domain/configuration";
import type { PromotionRepository } from "../infrastructure/repository";
import { createPromotionSchema, updatePromotionSchema } from "../schema";
import type {
  CreatePromotionInput,
  Promotion,
  PromotionQuery,
  PromotionSummary,
} from "../types";

function promotionError(operation: string, cause: unknown): AppError {
  const message = cause instanceof Error ? cause.message : "PROMOTION_OPERATION_FAILED";
  return new AppError("PROMOTION_OPERATION_FAILED", `Failed to ${operation}: ${message}`, { cause });
}

export class PromotionService {
  constructor(
    private readonly repository: PromotionRepository,
    private readonly storeSettingRepository: StoreSettingRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  private async getStoreLimits(): Promise<{ maxActive: number; maxHero: number }> {
    try {
      const allSettings = await this.storeSettingRepository.findAll();
      const storeSettings = toStoreSettings(allSettings);
      return {
        maxActive: storeSettings.maxActiveOffers ?? 10,
        maxHero: storeSettings.maxHeroOffers ?? 3,
      };
    } catch {
      return { maxActive: 10, maxHero: 3 };
    }
  }

  async getAdminPromotions(
    actorUserId: UserId,
    query: PromotionQuery = {},
  ): Promise<Result<{ items: PromotionSummary[]; total: number }, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.view");
    if (!authorized.success) return failure(authorized.error);

    try {
      return success(await this.repository.findAll(query));
    } catch (error) {
      return failure(promotionError("fetch promotions", error));
    }
  }

  async getAdminPromotion(
    actorUserId: UserId,
    id: string,
  ): Promise<Result<Promotion, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.view");
    if (!authorized.success) return failure(authorized.error);

    try {
      const promo = await this.repository.findById(id);
      return promo
        ? success(promo)
        : failure(new NotFoundError("PROMOTION", "Promotion not found.", { id }));
    } catch (error) {
      return failure(promotionError("fetch promotion details", error));
    }
  }

  async getPromotionLimitsUsage(
    actorUserId: UserId,
    excludeId?: string,
  ): Promise<Result<{ activeCount: number; maxActive: number; heroCount: number; maxHero: number }, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.view");
    if (!authorized.success) return failure(authorized.error);

    try {
      const limits = await this.getStoreLimits();
      const activeCount = await this.repository.countActivePromotions(excludeId);
      const heroCount = await this.repository.countHeroPromotions(excludeId);
      return success({
        activeCount,
        maxActive: limits.maxActive,
        heroCount,
        maxHero: limits.maxHero,
      });
    } catch (error) {
      return failure(promotionError("fetch promotion limit usage", error));
    }
  }

  async getPublicHeroPromotions(): Promise<Result<Promotion[], AppError>> {
    try {
      const { maxHero } = await this.getStoreLimits();
      const promos = await this.repository.findEligibleHeroPromotions(maxHero);
      return success(promos);
    } catch (error) {
      return failure(promotionError("fetch hero promotions", error));
    }
  }

  async getPublicOffers(): Promise<Result<Promotion[], AppError>> {
    try {
      const promos = await this.repository.findEligiblePublicOffers();
      return success(promos);
    } catch (error) {
      return failure(promotionError("fetch public offers", error));
    }
  }

  async getPublicOffer(slug: string): Promise<Result<Promotion, AppError>> {
    try {
      const promo = await this.repository.findBySlug(slug, true);
      return promo
        ? success(promo)
        : failure(new NotFoundError("PROMOTION", "Offer is not available or has expired.", { slug }));
    } catch (error) {
      return failure(promotionError("fetch offer details", error));
    }
  }

  async getParticipatingPromotionForProduct(productId: string): Promise<Result<Promotion | null, AppError>> {
    try {
      const promo = await this.repository.findParticipatingPromotionForProduct(productId);
      return success(promo);
    } catch (error) {
      return failure(promotionError("fetch product promotion", error));
    }
  }

  async createPromotion(
    actorUserId: UserId,
    rawInput: unknown,
  ): Promise<Result<Promotion, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.create");
    if (!authorized.success) return failure(authorized.error);

    const parsed = createPromotionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return failure(new ValidationError("Please check your promotion details.", { issues: parsed.error.issues }));
    }

    const input = parsed.data;
    const { maxActive, maxHero } = await this.getStoreLimits();

    // Check active offer limit
    if (input.isActive) {
      const currentActive = await this.repository.countActivePromotions();
      if (currentActive >= maxActive) {
        return failure(
          new ValidationError(
            `You already have the maximum number of enabled offers (${maxActive}). Disable another offer before enabling this one.`,
          ),
        );
      }
    }

    // Check hero offer limit
    if (input.isActive && input.showInHero) {
      const currentHero = await this.repository.countHeroPromotions();
      if (currentHero >= maxHero) {
        return failure(
          new ValidationError(
            `You already have the maximum number of homepage hero offers (${maxHero}). Remove another offer from the hero before adding this one.`,
          ),
        );
      }
    }

    try {
      const slug = await generateUniqueSlug(input.name, (candidate) => this.repository.slugExists(candidate));
      const created = await this.repository.create({
        ...input,
        slug,
      } as CreatePromotionInput & { slug: string });
      return success(created);
    } catch (error) {
      return failure(promotionError("create promotion", error));
    }
  }

  async updatePromotion(
    actorUserId: UserId,
    rawInput: unknown,
  ): Promise<Result<Promotion, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.update");
    if (!authorized.success) return failure(authorized.error);

    const parsed = updatePromotionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return failure(new ValidationError("Please check your promotion details.", { issues: parsed.error.issues }));
    }

    const input = parsed.data;
    const existing = await this.repository.findById(input.id);
    if (!existing) {
      return failure(new NotFoundError("PROMOTION", "Promotion not found.", { id: input.id }));
    }

    const nextIsActive = input.isActive !== undefined ? input.isActive : existing.isActive;
    const nextShowInHero = input.showInHero !== undefined ? input.showInHero : existing.showInHero;

    const { maxActive, maxHero } = await this.getStoreLimits();

    // Check active limit if turning active
    if (!existing.isActive && nextIsActive) {
      const currentActive = await this.repository.countActivePromotions(existing.id);
      if (currentActive >= maxActive) {
        return failure(
          new ValidationError(
            `You already have the maximum number of enabled offers (${maxActive}). Disable another offer before enabling this one.`,
          ),
        );
      }
    }

    // Check hero limit if making active hero
    if (nextIsActive && nextShowInHero && (!existing.isActive || !existing.showInHero)) {
      const currentHero = await this.repository.countHeroPromotions(existing.id);
      if (currentHero >= maxHero) {
        return failure(
          new ValidationError(
            `You already have the maximum number of homepage hero offers (${maxHero}). Remove another offer from the hero before adding this one.`,
          ),
        );
      }
    }

    try {
      const updated = await this.repository.update(input.id, input as Partial<CreatePromotionInput>);
      return success(updated);
    } catch (error) {
      return failure(promotionError("update promotion", error));
    }
  }

  async deletePromotion(
    actorUserId: UserId,
    id: string,
  ): Promise<Result<{ deleted: boolean }, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "promotions.delete");
    if (!authorized.success) return failure(authorized.error);

    const existing = await this.repository.findById(id);
    if (!existing) {
      return failure(new NotFoundError("PROMOTION", "Promotion not found.", { id }));
    }

    const orderCount = await this.repository.countOrdersUsingPromotion(id);
    if (orderCount > 0) {
      return failure(
        new ValidationError("This offer has order history and cannot be deleted. Deactivate it instead.", {
          orderCount,
        }),
      );
    }

    try {
      await this.repository.delete(id);
      return success({ deleted: true });
    } catch (error) {
      return failure(promotionError("delete promotion", error));
    }
  }
}
