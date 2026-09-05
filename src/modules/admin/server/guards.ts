import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, requirePermissionForUser } from "@/modules/auth/server/queries";

import { ADMIN_PERMISSIONS } from "../constants";
import { canAccessAdmin } from "../domain/policies";
import type { AdminContext } from "../types";

export async function getAdminContext(): Promise<AdminContext> {
  const currentUser = await getCurrentUser();

  if (!currentUser.success) {
    throw currentUser.error;
  }

  if (!currentUser.data) {
    redirect("/login");
  }

  if (currentUser.data.user.type !== "ADMIN") {
    redirect("/forbidden");
  }

  const permission = await requirePermissionForUser(
    currentUser.data.user.id,
    ADMIN_PERMISSIONS.access,
  );

  if (!permission.success) {
    if (permission.error.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    if (permission.error.code === "FORBIDDEN") {
      redirect("/forbidden");
    }

    throw permission.error;
  }

  if (!canAccessAdmin(currentUser.data.permissions)) {
    redirect("/forbidden");
  }

  return {
    user: currentUser.data.user,
    roles: currentUser.data.roles,
    permissions: currentUser.data.permissions,
    sessionId: currentUser.data.session.id,
  };
}

export const requireAdminAccess = getAdminContext;
