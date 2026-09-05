"use server";
import "server-only";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { requireCustomer } from "@/modules/auth/server/queries";
import { createNotificationService } from "../domain/service";
import { notificationIdSchema } from "../schema";

function refreshNotifications() {
  revalidatePath("/account/notifications");
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function markCustomerNotificationRead(input: unknown) {
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid notification."));
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  const result = await createNotificationService().markRead(actor.data.user.id, parsed.data.notificationId);
  if (result.success) refreshNotifications();
  return result;
}

export async function markAllCustomerNotificationsRead() {
  const actor = await requireCustomer();
  if (!actor.success) return failure(actor.error);
  const result = await createNotificationService().markAllRead(actor.data.user.id);
  if (result.success) refreshNotifications();
  return result;
}
