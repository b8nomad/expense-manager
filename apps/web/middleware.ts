import { NextResponse, type NextRequest } from "next/server"

import {
  AUTH_ROUTES,
  findRouteRule,
  getHomePathForRole,
  isUserRole,
} from "./lib/auth"

const PUBLIC_FILE_PATTERN = /\.(.*)$/
const LOGIN_ROUTE = "/auth/login"
const AUTH_ROUTE_SET = new Set(AUTH_ROUTES)
const PUBLIC_ROUTES = new Set(["/health"])

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = LOGIN_ROUTE
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`
  if (redirectTarget && redirectTarget !== LOGIN_ROUTE) {
    loginUrl.searchParams.set("redirectTo", redirectTarget)
  }
  return NextResponse.redirect(loginUrl)
}

function redirectToRoleHome(request: NextRequest, role: string) {
  const destination = request.nextUrl.clone()
  destination.pathname = getHomePathForRole(role)
  destination.search = ""
  return NextResponse.redirect(destination)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth_token")?.value ?? ""
  const roleCookie = request.cookies.get("user_role")?.value ?? ""
  const normalizedRole = roleCookie.toUpperCase()
  const hasValidRole = isUserRole(normalizedRole)

  if (AUTH_ROUTE_SET.has(pathname)) {
    if (token && hasValidRole) {
      return redirectToRoleHome(request, normalizedRole)
    }
    return NextResponse.next()
  }

  if (!token) {
    if (PUBLIC_ROUTES.has(pathname)) {
      return NextResponse.next()
    }
    return buildLoginRedirect(request)
  }

  if (!hasValidRole) {
    return NextResponse.next()
  }

  const rule = findRouteRule(pathname)
  if (rule && !rule.allowed.includes(normalizedRole)) {
    return redirectToRoleHome(request, normalizedRole)
  }

  if (pathname === "/" && hasValidRole) {
    return redirectToRoleHome(request, normalizedRole)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)"],
}
