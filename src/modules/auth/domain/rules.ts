import type { Session, User } from "@/modules/identity/types";

export function canAuthenticate(user: Pick<User, "status">): boolean {
  return user.status === "ACTIVE";
}

export function isSessionExpired(
  session: Pick<Session, "expiresAt">,
  now = new Date(),
): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}
