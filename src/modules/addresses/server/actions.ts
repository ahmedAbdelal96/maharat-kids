"use server";

import "server-only";

import { failure, success } from "@/core/result";
import { requireCustomer } from "@/modules/auth/server/queries";
import { resolveMarket } from "@/modules/market/server/resolver";
import { getPrismaClient } from "@/database/prisma";

import { AddressResolutionService } from "../domain/resolution-service";
import { DevelopmentAddressResolutionProvider } from "../providers/development-provider";
import { SplAddressResolutionProvider } from "../providers/spl-provider";

function resolutionService() {
  const provider = process.env.NODE_ENV === "production" ? new SplAddressResolutionProvider() : new DevelopmentAddressResolutionProvider();
  return new AddressResolutionService(getPrismaClient(), provider);
}

export async function startSaudiAddressResolution(input: { phone: string; consent: boolean }) {
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  const market = await resolveMarket();
  try { return success(await resolutionService().start(actor.data.user.id, market.market, input.phone, input.consent)); }
  catch (error) { return failure(new Error(error instanceof Error ? error.message : "ADDRESS_RESOLUTION_FAILED")); }
}

export async function verifySaudiAddressResolution(input: { sessionId: string; code: string }) {
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  try { return success(await resolutionService().verify(actor.data.user.id, input.sessionId, input.code)); }
  catch (error) { return failure(new Error(error instanceof Error ? error.message : "ADDRESS_RESOLUTION_FAILED")); }
}

export async function saveSaudiAddressResolution(input: { sessionId: string; choiceIndex: number; label?: string }) {
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  try { return success(await resolutionService().saveChoice(actor.data.user.id, input.sessionId, input.choiceIndex, input.label)); }
  catch (error) { return failure(new Error(error instanceof Error ? error.message : "ADDRESS_RESOLUTION_FAILED")); }
}
