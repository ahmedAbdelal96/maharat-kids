import { redirect } from "next/navigation";

import { AdminUsersClient } from "@/modules/admin/components/admin-users-client";
import { getAdminUsersPageData } from "@/modules/admin/server/queries";

export default async function AdminUsersPage() {
  const result = await getAdminUsersPageData();

  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED") {
      redirect("/login");
    }

    if (result.error.code === "FORBIDDEN") {
      redirect("/forbidden");
    }

    throw result.error;
  }

  return <AdminUsersClient {...result.data} />;
}
