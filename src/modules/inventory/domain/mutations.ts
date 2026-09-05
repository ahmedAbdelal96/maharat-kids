import "server-only";

import type { InventoryItemService } from "./service";
import type { AdjustInventoryInput } from "../types";

export function createInventoryMutations(service: InventoryItemService) {
  return {
    create(input: AdjustInventoryInput) {
      return service.create(input);
    },
  };
}
