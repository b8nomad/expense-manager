"use client"

import { ShieldCheck } from "lucide-react"
import { EditUserDialog } from "./edit-user-dialog"
import { DeleteUserButton } from "./delete-user-button"

type User = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "EMPLOYEE"
  manager: { id: string; name: string; email: string } | null
  isManagerApprover: boolean
}

type UsersTableProps = {
  users: User[]
  onUserUpdated?: () => void
  onUserDeleted?: () => void
}

export function UsersTable({ users, onUserUpdated, onUserDeleted }: UsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((member) => (
            <tr key={member.id} className="bg-white">
              <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
              <td className="px-4 py-3 text-slate-600">{member.role}</td>
              <td className="px-4 py-3 text-slate-600">{member.manager?.name ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">{member.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Active
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <EditUserDialog user={member} allUsers={users} onUserUpdated={onUserUpdated} />
                  <DeleteUserButton userId={member.id} userName={member.name} onUserDeleted={onUserDeleted} />
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr className="bg-white">
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                No team members found. Start by inviting your first teammate.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
