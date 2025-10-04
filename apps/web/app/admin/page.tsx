import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GitBranch,
  Layers,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminDashboard } from "@/lib/api"

const workflowStages = [
  {
    label: "Employee submits expense",
    description: "Receipts uploaded, currency conversion handled automatically.",
    icon: UploadCloud,
  },
  {
    label: "Manager review",
    description: "First approver validates amount, category, and notes.",
    icon: Users,
  },
  {
    label: "Approval rule evaluation",
    description: "Sequence and conditional thresholds applied before escalation.",
    icon: GitBranch,
  },
  {
    label: "Finance reconciliation",
    description: "Finance team audits and schedules reimbursement payouts.",
    icon: Wallet,
  },
]

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard()

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-600">
            Monitor your company's expense management and approval workflows at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/users">
              <Users className="mr-2 h-4 w-4" />
              Invite teammate
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/approval-flows">
              <GitBranch className="mr-2 h-4 w-4" />
              New workflow
            </Link>
          </Button>
        </div>
      </section>

      {/* Main Stats Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-900">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-amber-900">{dashboard.stats.pendingExpenses}</p>
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>{dashboard.stats.managerQueue} manager</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span>{dashboard.stats.adminQueue} admin</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-900">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-green-900">
              {dashboard.stats.reimbursementsThisMonth.currency}{" "}
              {dashboard.stats.reimbursementsThisMonth.total.toLocaleString()}
            </p>
            <p className="text-xs text-green-700">Total reimbursements</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">Active Approvers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-blue-900">{dashboard.stats.activeApprovers}</p>
            <p className="text-xs text-blue-700">Managers & reviewers</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-900">Automation</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-purple-900">{dashboard.stats.automationCoverage}%</p>
            <p className="text-xs text-purple-700">Workflow coverage</p>
          </CardContent>
        </Card>
      </section>

      {/* Onboarding Banner */}
      {(!dashboard.onboarding.hasTeam || !dashboard.onboarding.hasFlows || !dashboard.onboarding.hasCompanyProfile) && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-slate-900">Complete your setup</h3>
                <div className="flex flex-wrap gap-3">
                  {!dashboard.onboarding.hasTeam && (
                    <Link href="/admin/users">
                      <Button size="sm" variant="outline" className="gap-2 border-blue-200 bg-white hover:bg-blue-50">
                        <Users className="h-3.5 w-3.5" />
                        Add team members
                      </Button>
                    </Link>
                  )}
                  {!dashboard.onboarding.hasFlows && (
                    <Link href="/admin/approval-flows">
                      <Button size="sm" variant="outline" className="gap-2 border-blue-200 bg-white hover:bg-blue-50">
                        <GitBranch className="h-3.5 w-3.5" />
                        Create approval flow
                      </Button>
                    </Link>
                  )}
                  {!dashboard.onboarding.hasCompanyProfile && (
                    <Link href="/admin/settings">
                      <Button size="sm" variant="outline" className="gap-2 border-blue-200 bg-white hover:bg-blue-50">
                        <Layers className="h-3.5 w-3.5" />
                        Complete company profile
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Pending Approvals Table */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Recent Approvals</CardTitle>
              <CardDescription className="text-slate-600">
                Latest expenses awaiting review
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/expenses">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.pendingApprovals.slice(0, 5).map((item) => (
                    <tr key={`${item.expenseId}-${item.id}`} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{item.employee}</div>
                          {item.employeeEmail && (
                            <div className="text-xs text-slate-500">{item.employeeEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.currency} {item.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(item.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dashboard.pendingApprovals.length === 0 && (
                    <tr className="bg-white">
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="h-12 w-12 text-slate-300" />
                          <p className="text-sm font-medium text-slate-900">All caught up!</p>
                          <p className="text-xs text-slate-500">No pending approvals at this time</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Expense Lifecycle */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Expense Lifecycle
            </CardTitle>
            <CardDescription className="text-slate-600">
              How expenses flow through your system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowStages.map((stage, index) => {
              const Icon = stage.icon
              const isLast = index === workflowStages.length - 1
              return (
                <div key={stage.label} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 ring-2 ring-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 space-y-1 pb-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {stage.label}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">{stage.description}</p>
                    </div>
                  </div>
                  {!isLast && (
                    <div className="absolute left-5 top-10 h-full w-px bg-slate-200" />
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 hover:border-slate-300 transition-colors">
          <CardContent className="pt-6">
            <Link href="/admin/users" className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Manage Team</h3>
                <p className="text-sm text-slate-600 mt-1">Add, edit, or remove team members</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:border-slate-300 transition-colors">
          <CardContent className="pt-6">
            <Link href="/admin/approval-flows" className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <GitBranch className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Approval Workflows</h3>
                <p className="text-sm text-slate-600 mt-1">Configure approval sequences</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:border-slate-300 transition-colors">
          <CardContent className="pt-6">
            <Link href="/admin/expenses" className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">All Expenses</h3>
                <p className="text-sm text-slate-600 mt-1">View and manage all expenses</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}