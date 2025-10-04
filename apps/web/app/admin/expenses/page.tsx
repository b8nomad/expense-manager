"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Filter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Expense = {
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

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      // Reset to page 1 when search changes
      setPagination((prev) => ({ ...prev, page: 1 }))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== "all") {
          params.set("status", statusFilter)
        }
        if (debouncedSearch) {
          params.set("search", debouncedSearch)
        }
        params.set("page", pagination.page.toString())
        params.set("pageSize", pagination.pageSize.toString())

        const response = await fetch(`/api/admin/expenses?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch expenses")
        }

        const data = await response.json()
        setExpenses(data.expenses)
        setPagination(data.pagination)
      } catch (error) {
        console.error("Error fetching expenses:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExpenses()
  }, [statusFilter, pagination.page, pagination.pageSize, debouncedSearch])

  // Filter expenses by search query (client-side) - REMOVED, now using server-side search
  const filteredExpenses = expenses

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      APPROVED: "bg-green-50 text-green-700 border-green-200",
      REJECTED: "bg-red-50 text-red-700 border-red-200",
    }

    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
          styles[status as keyof typeof styles] || "border-slate-200 bg-slate-50 text-slate-600"
        }`}
      >
        {status}
      </span>
    )
  }

  const stats = {
    total: pagination.total,
    pending: expenses.filter((e) => e.status === "PENDING").length,
    approved: expenses.filter((e) => e.status === "APPROVED").length,
    rejected: expenses.filter((e) => e.status === "REJECTED").length,
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Company expenses</h2>
          <p className="text-sm text-slate-600">
            Monitor submissions, conversions, and the approval state for every claim across teams.
          </p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">{pagination.total}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Approved</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Expenses Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">All expenses</CardTitle>
              <CardDescription className="text-slate-600">
                View and filter expense submissions from all employees.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by employee, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">Loading expenses...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Converted</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length > 0 ? (
                      filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-slate-900">{expense.employee}</div>
                              {expense.employeeEmail && (
                                <div className="text-xs text-slate-500">{expense.employeeEmail}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {expense.description}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(expense.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {expense.currency} {expense.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {expense.amountConverted ? expense.amountConverted.toFixed(2) : "—"}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(expense.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="bg-white">
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-slate-300" />
                            <p className="text-sm font-medium text-slate-900">No expenses found</p>
                            <p className="text-xs text-slate-500">
                              {searchQuery
                                ? "Try adjusting your search query"
                                : "No expenses have been submitted yet"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <div className="text-sm text-slate-600">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                    {pagination.total} expenses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = pagination.page - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
