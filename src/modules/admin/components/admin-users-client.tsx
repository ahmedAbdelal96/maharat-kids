"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Permission, PermissionId, Role } from "@/modules/identity/types";

import {
  createAdminUser,
  createRole,
  deleteRole,
  updateAdminUser,
  updateRole,
} from "../server/actions";
import type { AdminRole, AdminUser } from "../types";

type ManageableStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type AddForm = {
  email: string;
  phone: string;
  password: string;
  roleId: string;
  status: ManageableStatus;
};

type EditForm = {
  phone: string;
  roleId: string;
  status: ManageableStatus;
};

type RoleForm = {
  name: string;
  description: string;
};

const emptyRoleForm: RoleForm = { name: "", description: "" };

function createEmptyAddForm(roleOptions: Role[]): AddForm {
  return {
    email: "",
    phone: "",
    password: "",
    roleId: roleOptions.find((role) => role.name === "ADMIN")?.id ?? roleOptions[0]?.id ?? "",
    status: "ACTIVE",
  };
}

function statusVariant(status: string): "success" | "warning" | "destructive" {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "destructive";
  return "warning";
}

function formError(result: { success: boolean; error?: { message: string } }): string {
  return result.success ? "" : result.error?.message ?? "The request could not be completed.";
}

export function AdminUsersClient({
  users,
  roles,
  permissions,
}: {
  users: AdminUser[];
  roles: AdminRole[];
  permissions: Permission[];
}) {
  const router = useRouter();
  const adminRoleOptions = useMemo(
    () => roles.filter((role) => role.name === "ADMIN" || role.permissionKeys.includes("admin.access")),
    [roles],
  );
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [addForm, setAddForm] = useState<AddForm>(() => createEmptyAddForm(adminRoleOptions));
  const [editForm, setEditForm] = useState<EditForm>({ phone: "", roleId: "", status: "ACTIVE" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;
    return users.filter((user) =>
      [user.email, user.phone ?? "", ...user.roles.map((role) => role.name)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [search, users]);

  function openAddModal() {
    setAddForm(createEmptyAddForm(adminRoleOptions));
    setFormErrorMessage(null);
    setIsAddOpen(true);
  }

  function openEditModal(user: AdminUser) {
    const selectedRole = user.roles.find((role) =>
      adminRoleOptions.some((option) => option.id === role.id),
    );
    setEditingUser(user);
    setEditForm({
      phone: user.phone ?? "",
      roleId: selectedRole?.id ?? adminRoleOptions[0]?.id ?? "",
      status:
        user.status === "ACTIVE" || user.status === "INACTIVE" || user.status === "SUSPENDED"
          ? user.status
          : "ACTIVE",
    });
    setFormErrorMessage(null);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsAddOpen(false);
    setEditingUser(null);
    setFormErrorMessage(null);
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormErrorMessage(null);

    try {
      const result = await createAdminUser(addForm);
      if (!result.success) {
        setFormErrorMessage(formError(result));
        return;
      }
      setIsAddOpen(false);
      setFeedback("Administration user created successfully.");
      router.refresh();
    } catch {
      setFormErrorMessage("The administration service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setFormErrorMessage(null);

    try {
      const result = await updateAdminUser({
        userId: editingUser.id,
        phone: editForm.phone,
        roleId: editForm.roleId,
        status: editForm.status,
      });
      if (!result.success) {
        setFormErrorMessage(formError(result));
        return;
      }
      setEditingUser(null);
      setFeedback("Administration user updated successfully.");
      router.refresh();
    } catch {
      setFormErrorMessage("The administration service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Users &amp; Access</h1>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
            Manage administration accounts, roles, and system permissions.
          </p>
        </div>
        {activeTab === "users" && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={openAddModal} disabled={adminRoleOptions.length === 0}>
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "users", label: "Users", count: users.length },
          { id: "roles", label: "Roles & Permissions", count: roles.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {feedback && (
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--success)]/20 bg-[var(--success-subtle)] px-3.5 py-2.5 text-xs font-medium text-[var(--success)]">
          <span>{feedback}</span>
          <button type="button" className="underline" onClick={() => setFeedback(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === "users" ? (
        <UsersTab users={filteredUsers} allUsersCount={users.length} search={search} onSearchChange={setSearch} onEdit={openEditModal} />
      ) : (
        <RolesTab roles={roles} permissions={permissions} onFeedback={setFeedback} />
      )}

      <Modal isOpen={isAddOpen} onClose={closeModal} title="Add User" description="Create an administration account." maxWidth="lg">
        <UserForm
          mode="create"
          form={addForm}
          roles={adminRoleOptions}
          isSubmitting={isSubmitting}
          errorMessage={formErrorMessage}
          onSubmit={handleAddSubmit}
          onChange={(field, value) => setAddForm((current) => ({ ...current, [field]: value }))}
        />
      </Modal>

      <Modal isOpen={editingUser !== null} onClose={closeModal} title="Edit User" description="Update status, phone number, or role." maxWidth="lg">
        <UserForm
          mode="edit"
          form={editForm}
          roles={adminRoleOptions}
          isSubmitting={isSubmitting}
          errorMessage={formErrorMessage}
          onSubmit={handleEditSubmit}
          onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
        />
      </Modal>
    </div>
  );
}

function UsersTab({
  users,
  allUsersCount,
  search,
  onSearchChange,
  onEdit,
}: {
  users: AdminUser[];
  allUsersCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (user: AdminUser) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search email, phone, or role..."
        icon={<Search className="h-4 w-4" />}
        className="max-w-md text-xs"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]">
                    {(user.email ?? user.phone ?? "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{user.email}</span>
                    <p className="text-[11px] text-[var(--text-muted)]">{user.phone || "No phone number"}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs text-[var(--text-secondary)]">
                {user.roles.map((role) => role.name).join(", ")}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(user.status)} size="sm">{user.status}</Badge>
              </TableCell>
              <TableCell className="text-xs text-[var(--text-secondary)]">{formatDate(user.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" aria-label={`Edit ${user.email}`} onClick={() => onEdit(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--text-secondary)]">
                {allUsersCount === 0 ? "No administration users found." : "No users match your search."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function UserForm({
  mode,
  form,
  roles,
  isSubmitting,
  errorMessage,
  onSubmit,
  onChange,
}: {
  mode: "create" | "edit";
  form: AddForm | EditForm;
  roles: Role[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: string, value: string) => void;
}) {
  const isCreate = mode === "create";
  const createForm = form as AddForm;
  const editForm = form as EditForm;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isCreate && (
        <>
          <div>
            <label htmlFor="admin-user-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Email</label>
            <Input id="admin-user-email" type="email" required value={createForm.email} onChange={(event) => onChange("email", event.target.value)} placeholder="admin@example.com" />
          </div>
          <div>
            <label htmlFor="admin-user-password" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Password</label>
            <Input id="admin-user-password" type="password" required minLength={12} value={createForm.password} onChange={(event) => onChange("password", event.target.value)} placeholder="At least 12 characters" />
          </div>
        </>
      )}
      <div>
        <label htmlFor={`${mode}-admin-user-phone`} className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Phone</label>
        <Input id={`${mode}-admin-user-phone`} type="tel" value={isCreate ? createForm.phone : editForm.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="Optional" />
      </div>
      <div>
        <label htmlFor={`${mode}-admin-user-role`} className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Role</label>
        <select
          id={`${mode}-admin-user-role`}
          required
          className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          value={isCreate ? createForm.roleId : editForm.roleId}
          onChange={(event) => onChange("roleId", event.target.value)}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.name}{role.name === "ADMIN" ? " — Full administration" : ""}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${mode}-admin-user-status`} className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Status</label>
        <select
          id={`${mode}-admin-user-status`}
          className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          value={isCreate ? createForm.status : editForm.status}
          onChange={(event) => onChange("status", event.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>
      {errorMessage && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">
          {errorMessage}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" isLoading={isSubmitting} disabled={roles.length === 0}>
          {isCreate ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

// ─── Permission Picker ────────────────────────────────────────────────────────

function PermissionPicker({
  permissions,
  selectedIds,
  onChange,
}: {
  permissions: Permission[];
  selectedIds: PermissionId[];
  onChange: (ids: PermissionId[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
      if (q && !p.key.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q)) return acc;
      const mod = p.key.split(".")[0] ?? "other";
      (acc[mod] ??= []).push(p);
      return acc;
    }, {});
  }, [permissions, search]);

  const totalSelected = selectedIds.length;
  const totalPermissions = permissions.length;

  function togglePermission(id: PermissionId, checked: boolean) {
    if (checked) {
      onChange(selectedIds.includes(id) ? selectedIds : [...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((pid) => pid !== id));
    }
  }

  function toggleModule(modPermissions: Permission[], allChecked: boolean) {
    const ids = modPermissions.map((p) => p.id);
    if (allChecked) {
      onChange(selectedIds.filter((id) => !ids.includes(id)));
    } else {
      const toAdd = ids.filter((id) => !selectedIds.includes(id));
      onChange([...selectedIds, ...toAdd]);
    }
  }

  function toggleCollapse(mod: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  }

  function clearAll() {
    onChange([]);
  }

  function selectAll() {
    onChange(permissions.map((p) => p.id));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--ring)] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            <span className="font-bold text-[var(--text-primary)]">{totalSelected}</span>/{totalPermissions}
          </span>
          <button
            type="button"
            onClick={selectAll}
            className="rounded px-2 py-1 text-[11px] font-semibold text-[var(--primary)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Module groups */}
      <div className="max-h-[420px] overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] divide-y divide-[var(--border)]">
        {Object.keys(grouped).length === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--text-muted)]">
            No permissions match your search.
          </div>
        ) : (
          Object.entries(grouped).map(([mod, modPermissions]) => {
            const selectedInModule = modPermissions.filter((p) => selectedIds.includes(p.id)).length;
            const allChecked = selectedInModule === modPermissions.length;
            const someChecked = selectedInModule > 0 && !allChecked;
            const isCollapsed = collapsedModules.has(mod);

            return (
              <div key={mod}>
                {/* Module header row */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-subtle)] sticky top-0 z-10">
                  {/* Collapse toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(mod)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label={isCollapsed ? "Expand" : "Collapse"}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Module select-all checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleModule(modPermissions, allChecked)}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                      allChecked
                        ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                        : someChecked
                        ? "bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)]",
                    )}
                    aria-label={`Toggle all ${mod} permissions`}
                  >
                    {allChecked && <Check className="h-2.5 w-2.5" />}
                    {someChecked && <span className="block h-0.5 w-2 bg-[var(--primary)] rounded-full" />}
                  </button>

                  {/* Module name */}
                  <span className="flex-1 text-xs font-bold capitalize text-[var(--text-primary)]">
                    {mod}
                  </span>

                  {/* Count badge */}
                  <span className={cn(
                    "text-[10px] font-semibold tabular-nums rounded-full px-2 py-0.5",
                    selectedInModule > 0
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                  )}>
                    {selectedInModule}/{modPermissions.length}
                  </span>
                </div>

                {/* Permission rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {modPermissions.map((permission) => {
                      const isChecked = selectedIds.includes(permission.id);
                      return (
                        <label
                          key={permission.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                            isChecked
                              ? "bg-[var(--primary)]/5"
                              : "hover:bg-[var(--surface-muted)]",
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                              isChecked
                                ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                                : "border-[var(--border)] bg-[var(--surface)]",
                            )}
                          >
                            {isChecked && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={(e) => togglePermission(permission.id, e.currentTarget.checked)}
                          />

                          {/* Permission info */}
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "block text-xs font-mono font-semibold truncate",
                              isChecked ? "text-[var(--primary)]" : "text-[var(--text-primary)]"
                            )}>
                              {permission.key}
                            </span>
                            <span className="block text-[11px] text-[var(--text-secondary)] truncate">
                              {permission.description}
                            </span>
                          </div>

                          {/* Active pill */}
                          {isChecked && (
                            <span className="shrink-0 text-[10px] font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-1.5 py-0.5">
                              On
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({
  roles,
  permissions,
  onFeedback,
}: {
  roles: AdminRole[];
  permissions: Permission[];
  onFeedback: (message: string) => void;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<AdminRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRoleForm);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<PermissionId[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function startCreateRole() {
    setRoleForm(emptyRoleForm);
    setErrorMessage(null);
    setIsCreateOpen(true);
  }

  function startEditRole(role: AdminRole) {
    setRoleForm({ name: role.name, description: role.description ?? "" });
    setErrorMessage(null);
    setEditingRole(role);
  }

  function startPermissions(role: AdminRole) {
    const permissionIds = permissions
      .filter((permission) => role.permissionKeys.includes(permission.key))
      .map((permission) => permission.id);
    setSelectedPermissionIds(permissionIds);
    setErrorMessage(null);
    setPermissionsRole(role);
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = isCreateOpen
        ? await createRole(roleForm)
        : await updateRole({ roleId: editingRole?.id, name: roleForm.name, description: roleForm.description });

      if (!result.success) {
        setErrorMessage(formError(result));
        return;
      }

      setIsCreateOpen(false);
      setEditingRole(null);
      onFeedback(isCreateOpen ? "Role created successfully." : "Role updated successfully.");
      router.refresh();
    } catch {
      setErrorMessage("The role service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function savePermissions() {
    if (!permissionsRole) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await updateRole({ roleId: permissionsRole.id, permissionIds: selectedPermissionIds });

      if (!result.success) {
        setErrorMessage(formError(result));
        return;
      }

      setPermissionsRole(null);
      onFeedback("Role permissions updated successfully.");
      router.refresh();
    } catch {
      setErrorMessage("The role service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDeleteRole() {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await deleteRole({ roleId: deleteTarget.id });

      if (!result.success) {
        setErrorMessage(formError(result));
        return;
      }

      setDeleteTarget(null);
      onFeedback("Role deleted successfully.");
      router.refresh();
    } catch {
      setErrorMessage("The role service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Roles &amp; Permissions</h2>
          <p className="text-xs text-[var(--text-secondary)]">System roles are protected. Custom roles start with no permissions.</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={startCreateRole}>
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
                  {role.name}
                </CardTitle>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{role.description || "No description provided."}</p>
              </div>
              <Badge variant={role.isSystemRole ? "secondary" : "outline"} size="sm">
                {role.isSystemRole ? "System" : "Custom"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4 text-xs text-[var(--text-secondary)]">
                <span>{role.userCount} users</span>
                <span>{role.permissionCount} permissions</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => startPermissions(role)}>
                  Manage Permissions
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Edit ${role.name}`} onClick={() => startEditRole(role)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {!role.isSystemRole && (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${role.name}`} onClick={() => { setErrorMessage(null); setDeleteTarget(role); }}>
                    <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        isOpen={isCreateOpen || editingRole !== null}
        onClose={() => { if (!isSubmitting) { setIsCreateOpen(false); setEditingRole(null); setErrorMessage(null); } }}
        title={isCreateOpen ? "Create Role" : "Edit Role"}
        description="Define a reusable administration role."
        maxWidth="lg"
      >
        <form onSubmit={submitRole} className="space-y-4">
          <div>
            <label htmlFor="role-name" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Name</label>
            <Input
              id="role-name"
              required
              disabled={editingRole?.isSystemRole === true}
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Orders Manager"
            />
          </div>
          <div>
            <label htmlFor="role-description" className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">Description</label>
            <Input
              id="role-description"
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Can manage order operations"
            />
          </div>
          {errorMessage && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>{isCreateOpen ? "Create Role" : "Save Changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal
        isOpen={permissionsRole !== null}
        onClose={() => { if (!isSubmitting) { setPermissionsRole(null); setErrorMessage(null); } }}
        title={`Permissions — ${permissionsRole?.name ?? "Role"}`}
        description={`${selectedPermissionIds.length} of ${permissions.length} permissions selected`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <PermissionPicker
            permissions={permissions}
            selectedIds={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
          />

          {errorMessage && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <span className="text-xs text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">{selectedPermissionIds.length}</span> permissions will be granted
            </span>
            <Button type="button" isLoading={isSubmitting} onClick={savePermissions}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Role Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => { if (!isSubmitting) { setDeleteTarget(null); setErrorMessage(null); } }}
        title="Delete custom role"
        description="This action is only allowed when no users are assigned to the role."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Delete <strong className="text-[var(--text-primary)]">{deleteTarget?.name}</strong>? System roles cannot be deleted.
          </p>
          {errorMessage && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">
              {errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" isLoading={isSubmitting} onClick={confirmDeleteRole}>Delete Role</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
