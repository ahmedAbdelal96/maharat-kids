import "server-only";

import type { AuthorizationService, IdentityService } from "../domain/services";
import type { UserId } from "../types";

export function createIdentityQueries(
  identity: IdentityService,
  authorization: AuthorizationService,
) {
  return {
    getUser: (userId: UserId) => identity.getUser(userId),
    hasPermission: (userId: UserId, permission: string) =>
      authorization.hasPermission(userId, permission),
    requirePermission: (userId: UserId, permission: string) =>
      authorization.requirePermission(userId, permission),
  };
}
