'use server';

import "server-only";

import { revalidatePath } from "next/cache";

import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import {
  PrismaPermissionRepository,
  PrismaUserRepository,
} from "@/modules/identity/infrastructure/repository";

import { StoreSettingService } from "../domain/service";
import { PrismaStoreSettingRepository } from "../infrastructure/repository";
import { storeSettingsUpdateSchema } from "../schema";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/modules/audit/constants";
import { writeAdminAudit } from "@/modules/audit/server/writer";

function createDefaultStoreSettingService(): StoreSettingService {
  return new StoreSettingService(
    new PrismaStoreSettingRepository(),
    new AuthorizationService(
      new PrismaPermissionRepository(),
      new PrismaUserRepository(),
    ),
  );
}

function toSettingInputs(input: ReturnType<typeof storeSettingsUpdateSchema.parse>) {
  return [
    { key: "store.name", value: input.name },
    { key: "store.email", value: input.email },
    { key: "store.phone", value: input.phone },
    { key: "store.currency", value: input.currency },
    { key: "store.language", value: input.language },
    { key: "seo.title", value: input.seoTitle },
    { key: "seo.description", value: input.seoDescription },
    { key: "auth.google.enabled", value: input.googleEnabled },
    { key: "promotions.maxActiveOffers", value: input.maxActiveOffers },
    { key: "promotions.maxHeroOffers", value: input.maxHeroOffers },
    { key: "returns.enabled", value: input.returnsEnabled },
    { key: "returns.windowDays", value: input.returnsWindowDays },
    { key: "returns.policyText", value: input.returnsPolicyText },
  ];
}

export async function updateStoreSettings(input: unknown) {
  const parsed = storeSettingsUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return failure(new ValidationError("Please review the store settings.", { issues: parsed.error.issues }));
  }

  const actor = await requireAuthenticatedUser();

  if (!actor.success) {
    return failure(actor.error);
  }

  const storeSettings = createDefaultStoreSettingService();
  const before = await storeSettings.getAllSettings(actor.data.user.id);

  if (!before.success) {
    return failure(before.error);
  }

  const result = await storeSettings.updateSettings(
    actor.data.user.id,
    toSettingInputs(parsed.data),
  );

  if (result.success) {
    const previousValues = new Map(before.data.map((setting) => [setting.key, setting.value]));
    const changed = result.data.filter((setting) => JSON.stringify(previousValues.get(setting.key)) !== JSON.stringify(setting.value));

    if (changed.length > 0) {
      await writeAdminAudit(actor.data, {
        action: AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.SETTINGS,
        entityLabel: "Store settings",
        changes: {
          fields: changed.map((setting) => ({
            field: setting.key,
            before: previousValues.get(setting.key) ?? null,
            after: setting.value,
          })),
        },
      });
    }
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
  }

  return result;
}
