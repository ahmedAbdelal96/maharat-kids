import { AppError, NotFoundError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { cacheTags, revalidateFeature } from "@/server/cache";
import { getPrismaClient } from "@/database/prisma";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";

import type { BulkUpdateSettingsInput, JsonValue, StoreSetting, StoreSettings, UpdateSettingInput } from "../types";
import type { StoreSettingRepository } from "../infrastructure/repository";

import { toStoreSettings } from "./configuration";

function operationError(operation: string, cause: unknown): AppError {
  return new AppError(
    "STORE_SETTINGS_OPERATION_FAILED",
    `Store settings operation failed: ${operation}.`,
    { cause },
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function validateSettingValue(key: string, value: unknown): Result<JsonValue, ValidationError> {
  if (!isJsonValue(value)) {
    return failure(new ValidationError("Setting values must be valid JSON.", { key }));
  }

  const result = (() => {
    switch (key) {
      case "store.name":
      case "store.language":
      case "store.phone":
      case "seo.title":
      case "seo.description":
        return typeof value === "string"
          ? success(value)
          : failure(new ValidationError("The setting value must be a string.", { key }));
      case "store.currency":
        return typeof value === "string" && /^[A-Z]{3}$/.test(value)
          ? success(value)
          : failure(new ValidationError("Currency must be a three-letter code.", { key }));
      case "store.email":
        return typeof value === "string" && (value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
          ? success(value)
          : failure(new ValidationError("Email must be valid or empty.", { key }));
      case "auth.google.enabled":
        return typeof value === "boolean"
          ? success(value)
          : failure(new ValidationError("Google sign-in setting must be boolean.", { key }));
      case "returns.enabled":
        return typeof value === "boolean"
          ? success(value)
          : failure(new ValidationError("Customer returns setting must be boolean.", { key }));
      case "returns.windowDays":
        return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365
          ? success(value)
          : failure(new ValidationError("Return window must be an integer between 1 and 365 days.", { key }));
      case "returns.policyText":
        return typeof value === "string" && value.length <= 2000
          ? success(value)
          : failure(new ValidationError("Return policy text must be a string up to 2,000 characters.", { key }));
      case "promotions.maxActiveOffers":
        return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100
          ? success(value)
          : failure(new ValidationError("Maximum active offers must be an integer between 1 and 100.", { key }));
      case "promotions.maxHeroOffers":
        return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10
          ? success(value)
          : failure(new ValidationError("Maximum hero offers must be an integer between 1 and 10.", { key }));
      default:
        return failure(new ValidationError("This setting is not supported.", { key }));
    }
  })();

  return result.success
    ? success(result.data as JsonValue)
    : failure(result.error);
}

export class StoreSettingService {
  constructor(
    private readonly repository: StoreSettingRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async getSetting(
    actorUserId: UserId,
    key: string,
  ): Promise<Result<StoreSetting, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "settings.view");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const setting = await this.repository.findByKey(key);
      return setting
        ? success(setting)
        : failure(new NotFoundError("STORE_SETTING", "Store setting does not exist.", { key }));
    } catch (error) {
      return failure(operationError("get setting", error));
    }
  }

  async getAllSettings(actorUserId: UserId): Promise<Result<StoreSetting[], AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "settings.view");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      return success(await this.repository.findAll());
    } catch (error) {
      return failure(operationError("get all settings", error));
    }
  }

  async getStoreSettings(actorUserId: UserId): Promise<Result<StoreSettings, AppError>> {
    const settings = await this.getAllSettings(actorUserId);

    return settings.success ? success(toStoreSettings(settings.data)) : failure(settings.error);
  }

  async getPublicStoreSettings(): Promise<Result<StoreSettings, AppError>> {
    try {
      return success(toStoreSettings(await this.repository.findAll()));
    } catch (error) {
      return failure(operationError("get public store settings", error));
    }
  }

  async updateSetting(
    actorUserId: UserId,
    input: UpdateSettingInput,
  ): Promise<Result<StoreSetting, AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "settings.update");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const existing = await this.repository.findByKey(input.key);

      if (!existing) {
        return failure(new NotFoundError("STORE_SETTING", "Store setting does not exist.", { key: input.key }));
      }

      const value = validateSettingValue(input.key, input.value);

      if (!value.success) {
        return failure(value.error);
      }

      const updated = await this.repository.update(input.key, value.data);
      revalidateFeature(cacheTags.storeSettings);
      return success(updated);
    } catch (error) {
      return failure(operationError("update setting", error));
    }
  }

  async updateSettings(
    actorUserId: UserId,
    inputs: BulkUpdateSettingsInput,
  ): Promise<Result<StoreSetting[], AppError>> {
    const authorized = await this.authorization.requirePermission(actorUserId, "settings.update");

    if (!authorized.success) {
      return failure(authorized.error);
    }

    try {
      const keys = new Set<string>();
      const validated: UpdateSettingInput[] = [];

      for (const input of inputs) {
        if (keys.has(input.key)) {
          return failure(new AppError("DUPLICATE_SETTING_KEY", "A setting key appears more than once.", { key: input.key }));
        }

        keys.add(input.key);

        const existing = await this.repository.findByKey(input.key);

        if (!existing) {
          return failure(new NotFoundError("STORE_SETTING", "Store setting does not exist.", { key: input.key }));
        }

        const value = validateSettingValue(input.key, input.value);

        if (!value.success) {
          return failure(value.error);
        }

        if (input.key === "promotions.maxActiveOffers") {
          const activeCount = await getPrismaClient().promotion.count({ where: { isActive: true } });
          if (typeof value.data === "number" && value.data < activeCount) {
            return failure(new ValidationError(`Cannot set Maximum Enabled Offers to ${value.data} because ${activeCount} offers are currently active. Disable some offers first.`, { key: input.key }));
          }
        }

        if (input.key === "promotions.maxHeroOffers") {
          const heroCount = await getPrismaClient().promotion.count({ where: { isActive: true, showInHero: true } });
          if (typeof value.data === "number" && value.data < heroCount) {
            return failure(new ValidationError(`Cannot set Maximum Homepage Hero Offers to ${value.data} because ${heroCount} hero offers are currently enabled. Remove some offers from the hero first.`, { key: input.key }));
          }
        }

        validated.push({ key: input.key, value: value.data });
      }

      const updated = await this.repository.bulkUpdate(validated);
      revalidateFeature(cacheTags.storeSettings);
      return success(updated);
    } catch (error) {
      return failure(operationError("bulk update settings", error));
    }
  }
}
