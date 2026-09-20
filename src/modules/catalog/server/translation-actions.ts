'use server';
import "server-only";
import { getPrismaClient } from "@/database/prisma";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { failure, success } from "@/core/result";
import { ValidationError } from "@/core/errors";
import { z } from "zod";
import type { UserId } from "@/modules/identity/types";
const schema = z.object({ productId: z.string().min(1), nameAr: z.string().trim().min(1), nameEn: z.string().trim().min(1) });
export async function saveProductTranslations(input: unknown) { const parsed = schema.safeParse(input); if (!parsed.success) return failure(new ValidationError("Arabic and English product names are required.")); const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const allowed = await new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository()).requirePermission(actor.data.user.id as UserId, "products.update"); if (!allowed.success) return failure(allowed.error); const db = getPrismaClient(); await db.productTranslation.upsert({ where: { productId_locale: { productId: parsed.data.productId, locale: "ar" } }, update: { name: parsed.data.nameAr }, create: { productId: parsed.data.productId, locale: "ar", name: parsed.data.nameAr } }); await db.productTranslation.upsert({ where: { productId_locale: { productId: parsed.data.productId, locale: "en" } }, update: { name: parsed.data.nameEn }, create: { productId: parsed.data.productId, locale: "en", name: parsed.data.nameEn } }); return success(true); }
