import "server-only";

import { loginPathForReturnTo } from "@/modules/auth/domain/policies";
import { getCurrentUser, requireCustomer } from "@/modules/auth/server/queries";
import { failure } from "@/core/result";
import { notificationListSchema } from "../schema";
import { createNotificationService } from "../domain/service";

export async function getCustomerNotifications(input: unknown = {}) {
  const parsed = notificationListSchema.safeParse(input);
  if (!parsed.success) return failure({ code: "INVALID_NOTIFICATION_QUERY", message: "Please select a valid notification view." });
  const actor = await requireCustomer();
  return actor.success ? createNotificationService().getForUser(actor.data.user.id, parsed.data) : actor;
}

export async function getUnreadNotificationCount() {
  const actor = await requireCustomer();
  return actor.success ? createNotificationService().getUnreadCount(actor.data.user.id) : actor;
}

export async function getStorefrontNotificationSummary() {
  const actor = await getCurrentUser();
  if (!actor.success || !actor.data || actor.data.user.type !== "CUSTOMER") return null;
  const result = await createNotificationService().getForUser(actor.data.user.id, { page: 1, pageSize: 8 });
  return result.success ? { unreadCount: result.data.unreadCount, notifications: result.data.items, href: "/account/notifications" } : { unreadCount: 0, notifications: [], href: "/account/notifications" };
}

export function getNotificationLoginHref() {
  return loginPathForReturnTo("/account/notifications");
}
