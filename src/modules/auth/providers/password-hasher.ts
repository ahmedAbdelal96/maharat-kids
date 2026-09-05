import "server-only";

import { env } from "@/config/env";
import type { PasswordHasher } from "@/modules/identity/domain/services";

import { ScryptPasswordHasher } from "./password-hasher-core";

export { ScryptPasswordHasher } from "./password-hasher-core";

export function createPasswordHasher(): PasswordHasher {
  return new ScryptPasswordHasher(env.AUTH_SECRET);
}
