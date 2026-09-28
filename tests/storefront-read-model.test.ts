import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = process.cwd();
const storefrontRepository = readFileSync(`${root}/src/modules/products/infrastructure/storefront-repository.ts`, "utf8");
const productCard = readFileSync(`${root}/src/components/ecommerce/product-card.tsx`, "utf8");
const pdp = readFileSync(`${root}/src/app/[locale]/(store)/products/[slug]/page.tsx`, "utf8");

test("storefront card loader is bounded and collection-oriented", () => {
  assert.match(storefrontRepository, /select: cardSelect/);
  assert.match(storefrontRepository, /getApprovedRatingSummaries\(this\.db, records\.map/);
  assert.doesNotMatch(storefrontRepository, /findCards[\s\S]{0,3000}include: this\.include/);
});

test("product cards have no database dependency", () => {
  assert.doesNotMatch(productCard, /PrismaClient|getPrismaClient|from ["']@\/database/);
});

test("PDP uses the bounded related-product read and not the catalog loader", () => {
  assert.match(pdp, /getPublicRelatedProducts/);
  assert.doesNotMatch(pdp, /getPublicProducts/);
});
