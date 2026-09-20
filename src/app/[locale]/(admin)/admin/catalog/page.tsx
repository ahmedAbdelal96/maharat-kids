import { getCatalogTaxonomy } from "@/modules/catalog/server/queries";
import { AdminCatalogTaxonomyClient } from "@/modules/catalog/components/admin-catalog-taxonomy-client";

export default async function AdminCatalogPage() {
  const [skills, objectives, productTypes, ageGroups] = await Promise.all([getCatalogTaxonomy("skill", false), getCatalogTaxonomy("objective", false), getCatalogTaxonomy("productType", false), getCatalogTaxonomy("ageGroup", false)]);
  return <AdminCatalogTaxonomyClient initial={{ skills, objectives, productTypes, ageGroups }} />;
}
