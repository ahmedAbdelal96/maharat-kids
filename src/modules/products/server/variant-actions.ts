"use server";

import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getPrismaClient } from "@/database/prisma";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { failure, success } from "@/core/result";
import { AppError, ValidationError } from "@/core/errors";
import { combinationKey, generateCombinations, VARIANT_COMBINATION_LIMIT } from "../domain/variants";

const optionSchema = z.object({
  id: z.string().optional(), nameAr: z.string().trim().min(1).max(120), nameEn: z.string().trim().min(1).max(120), sortOrder: z.number().int().min(0).max(9999).default(0), isActive: z.boolean().default(true),
  values: z.array(z.object({ id: z.string().optional(), labelAr: z.string().trim().min(1).max(120), labelEn: z.string().trim().min(1).max(120), sortOrder: z.number().int().min(0).max(9999).default(0), isActive: z.boolean().default(true), swatch: z.string().trim().max(100).nullable().optional(), imageMediaId: z.string().trim().nullable().optional() })).min(1),
});
const variantSchema = z.object({ id: z.string().optional(), optionValueIds: z.array(z.string().min(1)).min(1), sku: z.string().trim().min(1).max(100), barcode: z.string().trim().max(100).nullable().optional(), active: z.boolean().default(true), isDefault: z.boolean().default(false), sortOrder: z.number().int().min(0).max(9999).default(0), trackInventory: z.boolean().default(true), stockQuantity: z.number().int().min(0).max(2147483647).default(0), saudiPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), saudiCompareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), egyptPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), egyptCompareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), imageIds: z.array(z.string()).max(20).optional() });
const saveSchema = z.object({ productId: z.string().min(1), options: z.array(optionSchema).min(1).max(8), variants: z.array(variantSchema).default([]), generateMissing: z.boolean().default(true) });

const auth = new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository());

function resultError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "VARIANT_COMBINATION_LIMIT") return new ValidationError(`Too many combinations. Keep the generated matrix at ${VARIANT_COMBINATION_LIMIT} variants or fewer.`);
  if (error instanceof Error && error.message === "COMPARE_PRICE_INVALID") return new ValidationError("Compare-at price must be greater than or equal to price.");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return new ValidationError("Each variant SKU, barcode, and combination must be unique.");
  return new AppError("VARIANT_OPERATION_FAILED", "Variant configuration could not be saved.", { cause: error });
}

export async function saveProductVariants(input: unknown) {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please review the option and variant matrix.", { issues: parsed.error.issues }));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  const allowed = await auth.requirePermission(actor.data.user.id as never, "products.update");
  if (!allowed.success) return failure(allowed.error);
  try {
    const db = getPrismaClient();
    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: parsed.data.productId }, select: { id: true, sku: true, price: true, compareAtPrice: true, marketPrices: true } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      const optionIds: string[] = [];
      const activeOptions: Array<{ id: string; values: Array<{ id: string }> }> = [];
      for (const [optionIndex, optionInput] of parsed.data.options.entries()) {
        const existingOption = optionInput.id ? await tx.productOption.findFirst({ where: { id: optionInput.id, productId: product.id } }) : null;
        const option = existingOption
          ? await tx.productOption.update({ where: { id: existingOption.id }, data: { nameAr: optionInput.nameAr, nameEn: optionInput.nameEn, sortOrder: optionInput.sortOrder, isActive: optionInput.isActive } })
          : await tx.productOption.create({ data: { ...(optionInput.id ? { id: optionInput.id } : {}), productId: product.id, nameAr: optionInput.nameAr, nameEn: optionInput.nameEn, sortOrder: optionInput.sortOrder ?? optionIndex, isActive: optionInput.isActive } });
        optionIds.push(option.id);
        const valueIds: string[] = [];
        for (const [valueIndex, valueInput] of optionInput.values.entries()) {
          const existingValue = valueInput.id ? await tx.productOptionValue.findFirst({ where: { id: valueInput.id, optionId: option.id } }) : null;
          const value = existingValue
            ? await tx.productOptionValue.update({ where: { id: existingValue.id }, data: { labelAr: valueInput.labelAr, labelEn: valueInput.labelEn, sortOrder: valueInput.sortOrder ?? valueIndex, isActive: valueInput.isActive, swatch: valueInput.swatch ?? null, imageMediaId: valueInput.imageMediaId ?? null } })
            : await tx.productOptionValue.create({ data: { ...(valueInput.id ? { id: valueInput.id } : {}), optionId: option.id, labelAr: valueInput.labelAr, labelEn: valueInput.labelEn, sortOrder: valueInput.sortOrder ?? valueIndex, isActive: valueInput.isActive, swatch: valueInput.swatch ?? null, imageMediaId: valueInput.imageMediaId ?? null } });
          valueIds.push(value.id);
        }
        if (option.isActive) activeOptions.push({ id: option.id, values: (await tx.productOptionValue.findMany({ where: { id: { in: valueIds }, optionId: option.id, isActive: true }, select: { id: true } })) });
      }
      // Values omitted from the submitted editor are archived, never deleted.
      const allOptions = await tx.productOption.findMany({ where: { productId: product.id }, select: { id: true } });
      await tx.productOption.updateMany({ where: { productId: product.id, id: { notIn: optionIds } }, data: { isActive: false } });
      await tx.productOptionValue.updateMany({ where: { optionId: { in: allOptions.map((o) => o.id).filter((id) => !optionIds.includes(id)) } }, data: { isActive: false } });
      const combos = generateCombinations(activeOptions);
      const comboByKey = new Map(combos.map((combo) => [combinationKey(combo), combo]));
      const existing = await tx.productVariant.findMany({ where: { productId: product.id }, include: { optionValues: true } });
      const existingByKey = new Map(existing.map((variant) => [variant.combinationKey, variant]));
      const valueToOption = new Map<string, string>();
      for (const option of activeOptions) for (const value of option.values) valueToOption.set(value.id, option.id);
      for (const variantInput of parsed.data.variants) {
        const selection = variantInput.optionValueIds.map((valueId) => ({ optionId: valueToOption.get(valueId) ?? "", optionValueId: valueId }));
        if (selection.some((item) => !item.optionId) || new Set(selection.map((item) => item.optionId)).size !== activeOptions.length) throw new Error("INCOMPLETE_VARIANT");
        const key = combinationKey(selection);
        if (!comboByKey.has(key)) throw new Error("INVALID_VARIANT_COMBINATION");
        const prices = [
          { market: "SAUDI_ARABIA" as const, price: variantInput.saudiPrice, compareAtPrice: variantInput.saudiCompareAtPrice },
          { market: "EGYPT" as const, price: variantInput.egyptPrice, compareAtPrice: variantInput.egyptCompareAtPrice },
        ];
        for (const entry of prices) if (entry.price && entry.compareAtPrice && new Prisma.Decimal(entry.compareAtPrice).lt(new Prisma.Decimal(entry.price))) throw new Error("COMPARE_PRICE_INVALID");
        const skuOwner = await tx.product.findFirst({ where: { sku: variantInput.sku, id: { not: product.id } }, select: { id: true } });
        if (skuOwner || (product.sku === variantInput.sku && !variantInput.id)) throw new Error("SKU_CONFLICT");
        const data = { sku: variantInput.sku, barcode: variantInput.barcode ?? null, active: variantInput.active, isDefault: variantInput.isDefault, sortOrder: variantInput.sortOrder, trackInventory: variantInput.trackInventory, stockQuantity: variantInput.stockQuantity, combinationKey: key };
        const current = variantInput.id ? await tx.productVariant.findFirst({ where: { id: variantInput.id, productId: product.id } }) : existingByKey.get(key);
        const saved = current ? await tx.productVariant.update({ where: { id: current.id }, data }) : await tx.productVariant.create({ data: { productId: product.id, ...data, optionValues: { create: selection.map((item) => ({ optionValueId: item.optionValueId })) } } });
        if (current) {
          await tx.productVariantOptionValue.deleteMany({ where: { variantId: saved.id } });
          await tx.productVariantOptionValue.createMany({ data: selection.map((item) => ({ variantId: saved.id, optionValueId: item.optionValueId })), skipDuplicates: true });
        }
        for (const entry of prices) if (entry.price) await tx.productVariantMarketPrice.upsert({ where: { variantId_market: { variantId: saved.id, market: entry.market } }, create: { variantId: saved.id, market: entry.market, price: entry.price, compareAtPrice: entry.compareAtPrice ?? null }, update: { price: entry.price, compareAtPrice: entry.compareAtPrice ?? null } }); else await tx.productVariantMarketPrice.deleteMany({ where: { variantId: saved.id, market: entry.market } });
        if (variantInput.imageIds) { const ownedImages = await tx.productImage.count({ where: { id: { in: variantInput.imageIds }, productId: product.id } }); if (ownedImages !== new Set(variantInput.imageIds).size) throw new Error("VARIANT_IMAGE_INVALID"); await tx.productVariantImage.deleteMany({ where: { variantId: saved.id } }); await tx.productVariantImage.createMany({ data: variantInput.imageIds.map((productImageId, index) => ({ variantId: saved.id, productImageId, sortOrder: index })), skipDuplicates: true }); }
        existingByKey.set(key, saved as typeof existing[number]);
      }
      if (parsed.data.generateMissing) {
        let generatedIndex = existing.length + 1;
        for (const [key, combo] of comboByKey) {
          if (existingByKey.has(key)) continue;
          let sku = `${product.sku ?? "PRODUCT"}-V${String(generatedIndex).padStart(2, "0")}`;
          while (await tx.productVariant.findUnique({ where: { sku }, select: { id: true } })) { generatedIndex += 1; sku = `${product.sku ?? "PRODUCT"}-V${String(generatedIndex).padStart(2, "0")}`; }
          const created = await tx.productVariant.create({ data: { productId: product.id, sku, combinationKey: key, sortOrder: generatedIndex, optionValues: { create: combo.map((item) => ({ optionValueId: item.optionValueId })) } } });
          existingByKey.set(key, created as typeof existing[number]); generatedIndex += 1;
        }
      }
      const defaults = await tx.productVariant.findMany({ where: { productId: product.id, isDefault: true }, select: { id: true } });
      if (defaults.length > 1 || defaults.some((item) => item.id !== parsed.data.variants.find((variant) => variant.isDefault)?.id)) {
        const first = defaults[0];
        if (first) await tx.productVariant.updateMany({ where: { productId: product.id, id: { not: first.id } }, data: { isDefault: false } });
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { options: { include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }, variants: { include: { optionValues: true, marketPrices: true, images: true }, orderBy: { sortOrder: "asc" } } } });
    });
    return success(result);
  } catch (error) { return failure(resultError(error)); }
}

export async function getProductVariantConfiguration(productId: string) {
  const db = getPrismaClient();
  return db.product.findUnique({
    where: { id: productId },
    include: {
      options: { include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, marketPrices: true, images: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}
