export function canManageUsers(roleNames: readonly string[]): boolean {
  return roleNames.includes("ADMIN");
}

export function canManageRoles(roleNames: readonly string[]): boolean {
  return roleNames.includes("ADMIN");
}

export function canManagePermissions(roleNames: readonly string[]): boolean {
  return roleNames.includes("ADMIN");
}
