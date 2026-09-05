import type { UserStatus } from "@/modules/identity/types";

export function isCustomerStatus(status: UserStatus): boolean {
  return status !== "PENDING";
}
