export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE"

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  EMPLOYEE: "/employee",
}

export const AUTH_ROUTES = ["/auth/login", "/auth/register"]

export const PROTECTED_ROUTE_RULES: Array<{
  prefix: string
  allowed: UserRole[]
}> = [
  { prefix: "/admin", allowed: ["ADMIN"] },
  { prefix: "/manager", allowed: ["MANAGER", "ADMIN"] },
  { prefix: "/employee", allowed: ["EMPLOYEE", "MANAGER", "ADMIN"] },
]

export function getHomePathForRole(role?: string | null) {
  if (!role) return "/"
  const normalized = role.toUpperCase()
  if (isUserRole(normalized)) {
    return ROLE_HOME_PATH[normalized]
  }
  return "/"
}

export function findRouteRule(pathname: string) {
  return PROTECTED_ROUTE_RULES.find((rule) =>
    pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  )
}

export function isUserRole(value: string): value is UserRole {
  return value === "ADMIN" || value === "MANAGER" || value === "EMPLOYEE"
}
