"use client"

import Link from "next/link"
import {
  ArrowRight,
  Edit,
  Percent,
  Users,
  Zap,
  GitMerge,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteFlowButton } from "./delete-flow-button"
import { ToggleFlowButton } from "./toggle-flow-button"

type ApprovalFlow = {
  id: string
  name: string
  is_active: boolean
  sequence_type?: string
  min_approval_percentage?: number
  company: {
    id: string
    name: string
  }
  steps: Array<{
    id: string
    step_order: number
    approver_type: string
    approver_ref: string
  }>
  rules: Array<{
    id: string
    rule_type: string
  }>
}

type FlowsGridProps = {
  flows: ApprovalFlow[]
}

export function FlowsGrid({ flows }: FlowsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {flows.map((flow) => (
        <Card
          key={flow.id}
          className={`group relative overflow-hidden transition-all hover:shadow-lg ${
            flow.is_active
              ? "border-green-200 bg-gradient-to-br from-white to-green-50/30"
              : "border-slate-200 bg-gradient-to-br from-white to-slate-50/30"
          }`}
        >
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {flow.name}
                  </CardTitle>
                  {flow.sequence_type && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        flow.sequence_type === "PARALLEL"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                      title={
                        flow.sequence_type === "PARALLEL"
                          ? "Parallel approval mode"
                          : "Sequential approval mode"
                      }
                    >
                      {flow.sequence_type === "PARALLEL" ? (
                        <>
                          <GitMerge className="h-2.5 w-2.5" />
                          Parallel
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-2.5 w-2.5" />
                          Sequential
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">{flow.company.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div
                  className={`flex h-2 w-2 rounded-full ${
                    flow.is_active ? "bg-emerald-500 shadow-sm shadow-emerald-200" : "bg-slate-300"
                  }`}
                  title={flow.is_active ? "Active" : "Inactive"}
                />
                
              </div>
            </div>

            {/* Approval Settings Badge */}
            {flow.min_approval_percentage !== undefined && flow.min_approval_percentage < 100 && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs">
                <Percent className="h-3 w-3 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Minimum {flow.min_approval_percentage}% approval required
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pb-4">
            {/* Approval Steps */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Users className="h-3.5 w-3.5" />
                Approval sequence ({flow.steps.length}{" "}
                {flow.steps.length === 1 ? "step" : "steps"})
              </div>
              <div className="space-y-1.5">
                {flow.steps.slice(0, 3).map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {step.step_order}
                    </span>
                    {index < flow.steps.slice(0, 3).length && (
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate font-medium text-slate-700">{step.approver_ref}</span>
                      <span className="text-[10px] text-slate-500">
                        {step.approver_type === "ROLE" ? "Role-based" : "Specific user"}
                      </span>
                    </div>
                  </div>
                ))}
                {flow.steps.length > 3 && (
                  <div className="ml-8 rounded-md bg-slate-50 px-2 py-1.5">
                    <p className="text-xs text-slate-600">
                      +{flow.steps.length - 3} more{" "}
                      {flow.steps.length - 3 === 1 ? "step" : "steps"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Conditional Rules */}
            {flow.rules.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Conditional rules ({flow.rules.length})
                </div>
                <div className="space-y-1">
                  {flow.rules.slice(0, 2).map((rule) => (
                    <div
                      key={rule.id}
                      className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700 ring-1 ring-amber-100"
                    >
                      <span className="font-medium">{rule.rule_type}</span>
                    </div>
                  ))}
                  {flow.rules.length > 2 && (
                    <p className="pl-2 text-xs text-slate-500">
                      +{flow.rules.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {flow.rules.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2 text-center text-xs text-slate-500">
                No conditional rules
              </div>
            )}
          </CardContent>

          {/* Actions */}
          <div className="border-t border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 gap-1.5 text-xs hover:bg-slate-100" 
                asChild
              >
                <Link href={`/admin/approval-flows/${flow.id}/edit`}>
                  <Edit className="h-3.5 w-3.5" />
                  Edit workflow
                </Link>
              </Button>
              <div className="flex items-center gap-1">
                <ToggleFlowButton
                  flowId={flow.id}
                  flowName={flow.name}
                  isActive={flow.is_active}
                />
                <DeleteFlowButton flowId={flow.id} flowName={flow.name} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
