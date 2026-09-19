import { NextResponse } from "next/server";
import { searchSuggestionSchema } from "@/modules/search/schema";
import { getSearchSuggestions } from "@/modules/search/server/queries";
import { isLocale } from "@/config/locale";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? undefined;
  const parsed = searchSuggestionSchema.safeParse({ q: query });
  if (!parsed.success) return NextResponse.json({ query: "", products: [], categories: [] }, { status: 400 });
  const result = await getSearchSuggestions(parsed.data.q, isLocale(requestedLocale) ? requestedLocale : undefined);
  if (!result.success) return NextResponse.json({ query: parsed.data.q, products: [], categories: [] }, { status: 200 });
  return NextResponse.json(result.data, { headers: { "Cache-Control": "private, max-age=15" } });
}
