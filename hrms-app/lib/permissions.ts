export type UserRole = "SUPER_ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  HR: [
    "company:read",
    "employee:*",
    "attendance:*",
    "leave:*",
    "payroll:*",
    "reports:read",
    "department:read",
    "department:create",
    "department:update",
    "department:delete",
    "performance:*",
    "document:*",
    "audit:read",
  ],
  MANAGER: [
    "employee:read",
    "department:read",
    "attendance:read",
    "attendance:create",
    "attendance:correction:review",
    "leave:read",
    "leave:approve",
    "performance:*",
    "team:read",
  ],
  EMPLOYEE: [
    "profile:read",
    "leave:create",
    "leave:read",
    "attendance:create",
    "attendance:read",
    "attendance:correction:create",
    "department:read",
    "payroll:read",
    "document:read",
    "document:create",
    "performance:read",
  ],
};

export function canAccess(role: UserRole | string | undefined, permission: string) {
  const normalizedRole = (role ?? "EMPLOYEE") as UserRole;
  const permissions = ROLE_PERMISSIONS[normalizedRole] ?? [];

  if (permissions.includes("*")) {
    return true;
  }

  const baseline = permission.toLowerCase();
  const wildcard = `${baseline.split(":")[0]}:*`;

  return permissions.some((item) => {
    const normalized = item.toLowerCase();
    return normalized === baseline || normalized === wildcard;
  });
}

export function hasAnyAccess(role: UserRole | string | undefined, permissions: string[]) {
  return permissions.some((permission) => canAccess(role, permission));
}
