import Link from "next/link"
import {
  CheckCircle,
  GitBranch,
  PlusCircle,
  Workflow,
  Power,
  PowerOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getApprovalFlows } from "@/lib/api"
import { FlowsGrid } from "./flows-grid"

export default async function ApprovalFlowsPage() {
  const { flows } = await getApprovalFlows()

  const stats = {
    total: flows.length,
    active: flows.filter((f) => f.is_active).length,
    inactive: flows.filter((f) => !f.is_active).length,
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Approval workflows</h2>
          <p className="text-sm text-slate-600">
            Design step-by-step approval sequences for different expense types.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/admin/approval-flows/new">
            <PlusCircle className="h-4 w-4" />
            Create workflow
          </Link>
        </Button>
      </section>

      {flows.length > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Workflow className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div> <p className="text-sm font-medium text-green-700">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <Power className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Inactive</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
                </div>
                <PowerOff className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {flows.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
          <CardContent>
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Get started</h3>
          </CardContent>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <GitBranch className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">No approval workflows yet</h3>
            <p className="mb-6 max-w-sm text-sm text-slate-600">
              Create your first approval workflow to automatically route expenses to the right
              reviewers based on amount, category, or custom rules.
            </p>
            <Button className="gap-2" asChild>
              <Link href="/admin/approval-flows/new">
                <PlusCircle className="h-4 w-4" />
                Create your first workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <FlowsGrid flows={flows} />
      )}

      {/* Quick guide */}
      <Card className="border-slate-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">How approval workflows work</h3>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong>Sequential approval:</strong> Expenses move through approvers in order.
                    Each step must approve before moving to the next.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong>Parallel approval:</strong> All approvers review simultaneously,
                    and approval is granted when the minimum percentage threshold is met.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong>Role-based or specific users:</strong> Assign by role (e.g., MANAGER)
                    or choose a specific person.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    <strong>Flexible settings:</strong> Configure minimum approval percentages
                    and choose between sequential or parallel approval modes.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
