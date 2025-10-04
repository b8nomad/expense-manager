import { cookies } from "next/headers"

function resolveBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
  }

  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, "")
  }

  return "http://localhost:3001"
}

export function getApiBaseUrl() {
  return resolveBaseUrl()
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    throw new Error("Missing authentication token")
  }

  const normalizedPath = path.startsWith("http")
    ? path
    : `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`

  const headers = new Headers(init?.headers ?? {})
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (!headers.has("Content-Type") && init?.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(normalizedPath, {
    cache: "no-store",
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { error?: string; message?: string }
      if (body?.error) {
        message = body.error
      } else if (body?.message) {
        message = body.message
      }
    } catch {
      // ignore JSON parse errors and fall back to default message
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return {} as T
  }

  return (await response.json()) as T
}

export type User = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "EMPLOYEE"
  manager: { id: string; name: string; email: string } | null
  isManagerApprover: boolean
}

export type Expense = {
  id: string
  employee: string
  employeeEmail: string | null
  description: string
  category: string
  amount: number
  currency: string
  amountConverted: number | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  submittedAt: string
  createdAt: string
}

export type ApprovalFlow = {
  id: string
  name: string
  company_id: string
  is_active: boolean
  created_at: string
  steps: Array<{
    id: string
    step_order: number
    approver_type: "USER" | "ROLE"
    approver_ref: string
    can_escalate_in: number | null
  }>
  rules: Array<{
    id: string
    rule_type: "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID"
    params: Record<string, any>
  }>
  company: {
    id: string
    name: string
  }
}

export type DashboardStats = {
  company: {
    id: string
    name: string
    country: string
    currency: string
    createdAt: string | null
  }
  stats: {
    pendingExpenses: number
    managerQueue: number
    adminQueue: number
    reimbursementsThisMonth: {
      total: number
      currency: string
    }
    activeApprovers: number
    automationCoverage: number
  }
  onboarding: {
    hasTeam: boolean
    hasFlows: boolean
    hasCompanyProfile: boolean
  }
  pendingApprovals: Array<{
    id: string
    expenseId: string
    employee: string
    employeeEmail: string | null
    category: string
    amount: number
    currency: string
    amountConverted: number | null
    submittedAt: string
    status: string
    stepOrder: number | null
    approverType: string | null
    approverRef: string | null
  }>
}

export type Company = {
  id: string
  name: string
  country: string
  currency: string
  createdAt: string
  members: number
  approvalFlows: number
}

// Admin API functions
export async function getAdminDashboard(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/admin/dashboard")
}

export async function getAdminUsers(): Promise<{ users: User[] }> {
  return apiFetch<{ users: User[] }>("/api/admin/users")
}

export async function getAdminExpenses(params?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<{
  expenses: Expense[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", params.page.toString())
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString())

  const query = searchParams.toString()
  return apiFetch(`/api/admin/expenses${query ? `?${query}` : ""}`)
}

export async function getCompanyProfile(): Promise<{ company: Company }> {
  return apiFetch<{ company: Company }>("/api/admin/company")
}

export async function updateCompanyProfile(data: {
  name?: string
  country?: string
  currency?: string
}): Promise<{ company: Company; message: string }> {
  return apiFetch("/api/admin/company", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function getApprovalFlows(): Promise<{ flows: ApprovalFlow[] }> {
  return apiFetch<{ flows: ApprovalFlow[] }>("/api/approval-flows")
}

export async function getApprovalFlow(id: string): Promise<{ flow: ApprovalFlow }> {
  return apiFetch<{ flow: ApprovalFlow }>(`/api/approval-flows/${id}`)
}

export async function createApprovalFlow(data: {
  name: string
  steps: Array<{
    step_order: number
    approver_type: "USER" | "ROLE"
    approver_ref: string
    can_escalate_in?: number
  }>
  rules?: Array<{
    rule_type: "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID"
    params: Record<string, any>
  }>
}): Promise<{ flow: ApprovalFlow; message: string }> {
  return apiFetch("/api/approval-flows", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getPendingApprovals(params?: {
  page?: number
  pageSize?: number
  sort?: string
}): Promise<{
  approvals: Array<{
    approvalId: string
    expenseId: string
    employee: { id: string; name: string; email: string }
    amount: number
    currency: string
    category: string
    description: string
    date: string
    step_order: number | null
    approver_type: string | null
    approver_ref: string | null
    createdAt: string
  }>
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", params.page.toString())
  if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString())
  if (params?.sort) searchParams.set("sort", params.sort)

  const query = searchParams.toString()
  return apiFetch(`/api/approvals/pending${query ? `?${query}` : ""}`)
}

export async function createUser(data: {
  name: string
  email: string
  role: "EMPLOYEE" | "MANAGER" | "ADMIN"
  managerId?: string
  password?: string
}): Promise<{ user: User; message: string }> {
  return apiFetch("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateUser(
  userId: string,
  data: {
    name: string
    email: string
    role: "EMPLOYEE" | "MANAGER" | "ADMIN"
    managerId?: string
    password?: string
  }
): Promise<{ user: User; message: string }> {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  })
}
