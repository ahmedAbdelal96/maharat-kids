import "server-only";

import type { ProductService } from "./service";

export function createProductsMutations(service: ProductService, actorId: string) { return { create(input: Parameters<ProductService["create"]>[1]) { return service.create(actorId, input); } }; }
