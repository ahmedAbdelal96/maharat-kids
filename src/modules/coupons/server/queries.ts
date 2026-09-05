import "server-only";

import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { CouponService } from "../domain/service";
import { PrismaCouponRepository } from "../infrastructure/repository";
import type { CouponQuery } from "../types";

function service() { return new CouponService(new PrismaCouponRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }

export async function getAdminCoupons(query?: CouponQuery) { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); return service().list(actor.data.user.id, query); }
export async function getAdminCoupon(id: string) { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); return service().detail(actor.data.user.id, id); }
