import "server-only";

import type { CategoryService } from "./service";

export function createCategoriesMutations(service: CategoryService, actorId: string) { return { create(input: Parameters<CategoryService["create"]>[1]) { return service.create(actorId, input); } }; }
