import "server-only";
import { CatalogRepository } from "./repository";
import type { CatalogTaxonomyKind } from "../types";
export async function getCatalogTaxonomy(kind: CatalogTaxonomyKind, activeOnly = true) { return new CatalogRepository().listTaxonomy(kind, activeOnly); }
export async function getProductEducation(productId: string) { return new CatalogRepository().findProductEducation(productId); }
export async function getRelatedProducts(productId: string, market: "SAUDI_ARABIA" | "EGYPT") { return new CatalogRepository().relatedProducts(productId, market); }
