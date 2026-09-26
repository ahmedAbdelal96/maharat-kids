import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Pass the original request unchanged so platform-owned headers, including
  // x-vercel-ip-country, remain available to downstream server rendering.
  const response = intlMiddleware(request);
  const vary = new Set((response.headers.get("Vary") ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  vary.add("x-vercel-ip-country");
  response.headers.set("Vary", [...vary].join(", "));
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
  ],
};
