import type { User, UserStatus } from "../types";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isActiveUser(user: Pick<User, "status">): boolean {
  return user.status === "ACTIVE";
}

export function isAssignableStatus(status: UserStatus): boolean {
  return status !== "SUSPENDED";
}
