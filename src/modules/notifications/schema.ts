import { z } from "zod";

export const notificationListSchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  unreadOnly: z.boolean().optional(),
});

export const notificationIdSchema = z.object({
  notificationId: z.string().trim().min(1),
});
