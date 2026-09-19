import "server-only";

import { SearchService } from "../domain/service";
import { PrismaSearchRepository } from "../infrastructure/repository";

function service() { return new SearchService(new PrismaSearchRepository()); }

export async function getSearchSuggestions(query: string, locale?: "ar" | "en") {
  return service().suggestions(query, locale);
}
