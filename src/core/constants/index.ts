export const environmentNames = ["development", "test", "production"] as const;
export type EnvironmentName = (typeof environmentNames)[number];

export const permissionRoles = {
  admin: "admin",
  customer: "customer",
} as const;
