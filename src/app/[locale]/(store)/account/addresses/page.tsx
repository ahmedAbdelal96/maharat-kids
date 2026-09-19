import { CustomerAccountPage } from "@/modules/customers/components/customer-account-page";

export const dynamic = "force-dynamic";

export default async function CustomerAddressesPage() {
  return <CustomerAccountPage initialSection="addresses" />;
}
