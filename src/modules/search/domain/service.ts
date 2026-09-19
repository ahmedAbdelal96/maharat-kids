import "server-only";

import { AppError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import { normalizeSearchQuery } from "./normalization";
import type { SearchRepository } from "../infrastructure/repository";
import type { SearchSuggestions } from "../types";

export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async suggestions(rawQuery: string, locale?: "ar" | "en"): Promise<Result<SearchSuggestions, AppError>> {
    const query = normalizeSearchQuery(rawQuery);
    if (query.length < 2) return success({ query, products: [], categories: [] });
    try {
      return success(await this.repository.findSuggestions(query, locale));
    } catch (error) {
      return failure(new AppError("SEARCH_SUGGESTIONS_FAILED", "Search suggestions are temporarily unavailable.", { cause: error }));
    }
  }
}
