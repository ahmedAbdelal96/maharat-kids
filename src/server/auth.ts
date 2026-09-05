import "server-only";

import { UnauthorizedError } from "@/core/errors";
import { getCurrentUser } from "@/modules/auth/server/queries";

export type AuthSession = {
  userId: string;
  roles: string[];
  permissions: string[];
};

/** Server-managed session adapter used by protected application code. */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const result = await getCurrentUser();

  if (!result.success || !result.data) {
    return null;
  }

  return {
    userId: result.data.user.id,
    roles: result.data.roles.map((role) => role.name),
    permissions: result.data.permissions,
  };
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getCurrentSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
}
