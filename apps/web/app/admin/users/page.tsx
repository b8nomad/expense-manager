"use client"

import { useEffect, useState } from "react"
import { Filter, PlusCircle, Search, ShieldCheck, UserRoundCog, Users, X } from "lucide-react"

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
import { AddUserDialog } from "./add-user-dialog"
import { UsersTable } from "./users-table"

type User = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "EMPLOYEE"
  manager: { id: string; name: string; email: string } | null
  isManagerApprover: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (roleFilter !== "all") {
          params.set("role", roleFilter)
        }
        if (debouncedSearch) {
          params.set("search", debouncedSearch)
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }

        const data = await response.json()
        setUsers(data.users)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [roleFilter, debouncedSearch])

  const handleRoleChange = (value: string) => {
    setRoleFilter(value)
  }

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    managers: users.filter((u) => u.role === "MANAGER").length,
    employees: users.filter((u) => u.role === "EMPLOYEE").length,
  }

  const refetchUsers = async () => {
    const params = new URLSearchParams()
    if (roleFilter !== "all") {
      params.set("role", roleFilter)
    }
    if (debouncedSearch) {
      params.set("search", debouncedSearch)
    }

    const response = await fetch(`/api/admin/users?${params.toString()}`)
    if (response.ok) {
      const data = await response.json()
      setUsers(data.users)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Team directory</h2>
          <p className="text-sm text-slate-600">
            Invite employees, assign managers, and keep approval roles in sync with your org chart.
          </p>
        </div>
        <AddUserDialog users={users} onUserAdded={refetchUsers} />
      </section>

      {/* Stats Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Admins</p>
                <p className="text-2xl font-bold text-purple-900">{stats.admins}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Managers</p>
                <p className="text-2xl font-bold text-blue-900">{stats.managers}</p>
              </div>
              <UserRoundCog className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Employees</p>
                <p className="text-2xl font-bold text-green-900">{stats.employees}</p>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Users Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">People</CardTitle>
              <CardDescription className="text-slate-600">
                Map approvers to employees so every expense finds the right reviewer.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
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
              <Select value={roleFilter} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">Loading users...</p>
            </div>
          ) : users.length > 0 ? (
            <UsersTable users={users} onUserUpdated={refetchUsers} onUserDeleted={refetchUsers} />
          ) : (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <Users className="h-12 w-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-900">No users found</p>
                <p className="text-xs text-slate-500">
                  {searchQuery || roleFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Add your first team member to get started"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
