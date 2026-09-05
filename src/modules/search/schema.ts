import { z } from "zod";

export const searchSuggestionSchema = z.object({
  q: z.string().trim().max(100),
});
