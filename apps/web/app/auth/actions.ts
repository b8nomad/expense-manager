"use server"

import { cookies } from "next/headers"
import { isUserRole, type UserRole } from "@/lib/auth"

export type AuthFormState = {
  status: "idle" | "error" | "success"
  message?: string
  role?: UserRole
}

type CookieOptions = {
  httpOnly?: boolean
  sameSite?: "lax" | "strict" | "none"
  secure?: boolean
  path?: string
  maxAge?: number
}

const cookieDefaults: CookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

function getApiBaseUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:3001"
}

async function parseResponse<T>(response: Response) {
  try {
    return (await response.json()) as T & { error?: string }
  } catch (error) {
    console.error("Failed to parse response", error)
    return { error: "Unexpected server response" } as T & { error: string }
  }
}

type MutableRequestCookies = Awaited<ReturnType<typeof cookies>> & {
  set: (name: string, value: string, options?: CookieOptions) => void
}

function getTrimmedValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

async function persistSession(token: string, role: UserRole, email: string) {
  const cookieStore = (await cookies()) as MutableRequestCookies
  cookieStore.set("auth_token", token, cookieDefaults)
  cookieStore.set("user_role", role, {
    ...cookieDefaults,
    httpOnly: false,
  })
  cookieStore.set("user_email", email, {
    ...cookieDefaults,
    httpOnly: false,
  })
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = getTrimmedValue(formData, "email")
  const password = getValue(formData, "password")

  if (!email || !password) {
    return {
      status: "error",
      message: "Please provide both email and password.",
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

  const data = await parseResponse<{ token?: string; user?: { role?: string; email?: string } }>(response)

    if (!response.ok || !data || !data.token || !data.user?.role || !isUserRole(data.user.role)) {
      return {
        status: "error",
        message: data?.error ?? "Invalid credentials. Please try again.",
      }
    }

    await persistSession(data.token, data.user.role, data.user.email ?? email)

    return {
      status: "success",
      role: data.user.role,
      message: "Login successful",
    }
  } catch (error) {
    console.error("Login failed", error)
    return {
      status: "error",
      message: "Unable to reach the server. Please try again.",
    }
  }
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = getTrimmedValue(formData, "email")
  const password = getValue(formData, "password")
  const confirmPassword = getValue(formData, "confirmPassword")
  const userName = getTrimmedValue(formData, "userName")
  const companyName = getTrimmedValue(formData, "companyName")
  const country = getTrimmedValue(formData, "country")
  const currency = getTrimmedValue(formData, "currency").toUpperCase()

  if (!email || !password || !userName || !companyName || !country || !currency) {
    return {
      status: "error",
      message: "Please fill in all required fields.",
    }
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        userName,
        companyName,
        country,
        currency,
      }),
    })

    const data = await parseResponse<{
      token?: string
      user?: { role?: string; email?: string }
      message?: string
    }>(response)

    if (!response.ok || !data?.token || !data.user?.role || !isUserRole(data.user.role)) {
      return {
        status: "error",
        message: data?.error ?? "Registration failed. Please try again.",
      }
    }

    await persistSession(data.token, data.user.role, data.user.email ?? email)

    return {
      status: "success",
      role: data.user.role,
      message: data.message ?? "Registration successful",
    }
  } catch (error) {
    console.error("Registration failed", error)
    return {
      status: "error",
      message: "Unable to reach the server. Please try again.",
    }
  }
}
