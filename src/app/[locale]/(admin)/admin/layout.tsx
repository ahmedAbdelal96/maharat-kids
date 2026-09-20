import type { ReactNode } from "react";
import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";
import { getAdminContext } from "@/modules/admin/server/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await getAdminContext();
  const role = context.roles.map((assignedRole) => assignedRole.name).join(", ") || "ADMIN";

  return (
    <AdminLayoutShell
      userName={context.user.email ?? context.user.name ?? "Admin"}
      userRole={role}
      sessionId={context.sessionId}
      permissions={context.permissions}
    >
      {children}
    </AdminLayoutShell>
  );
}
