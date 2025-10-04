"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Step = {
  id: string
  step_order: number
  approver_type: "ROLE" | "USER"
  approver_ref: string
}

export default function NewApprovalFlowPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [minApprovalPercentage, setMinApprovalPercentage] = useState(100)
  const [sequenceType, setSequenceType] = useState<"sequential" | "parallel">("sequential")
  const [steps, setSteps] = useState<Step[]>([
    {
      id: crypto.randomUUID(),
      step_order: 1,
      approver_type: "ROLE",
      approver_ref: "",
    },
  ])

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        step_order: steps.length + 1,
        approver_type: "ROLE",
        approver_ref: "",
      },
    ])
  }

  const removeStep = (id: string) => {
    if (steps.length === 1) {
      toast.error("You must have at least one approval step")
      return
    }
    const newSteps = steps.filter((s) => s.id !== id)
    // Re-order steps
    setSteps(
      newSteps.map((s, idx) => ({
        ...s,
        step_order: idx + 1,
      }))
    )
  }

  const updateStep = (id: string, field: keyof Step, value: any) => {
    setSteps(
      steps.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate
      if (!name.trim()) {
        toast.error("Workflow name is required")
        setIsSubmitting(false)
        return
      }

      for (const step of steps) {
        if (!step.approver_ref.trim()) {
          toast.error(`Step ${step.step_order}: Approver is required`)
          setIsSubmitting(false)
          return
        }
      }

      // Create the flow
      const response = await fetch("/api/approval-flows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sequence_type: sequenceType.toUpperCase(),
          min_approval_percentage: minApprovalPercentage,
          steps: steps.map((s) => ({
            step_order: s.step_order,
            approver_type: s.approver_type,
            approver_ref: s.approver_ref,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create workflow")
      }

      toast.success("Workflow created successfully")
      router.push("/admin/approval-flows")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workflow")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/approval-flows">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Create approval workflow</h2>
          <p className="text-sm text-slate-600">
            Define step-by-step approval sequences for expense routing.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Workflow details</CardTitle>
            <CardDescription>
              Give your workflow a descriptive name to identify its purpose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Workflow name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marketing Expenses, Travel Reimbursement"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Approval settings</CardTitle>
            <CardDescription>
              Configure how approvals are processed for this workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Approver sequence</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="sequence"
                    value="sequential"
                    checked={sequenceType === "sequential"}
                    onChange={(e) => setSequenceType(e.target.value as "sequential")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Sequential</div>
                    <div className="text-sm text-slate-600">
                      Expenses move through approvers one by one in order. Each step must approve
                      before moving to the next.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="sequence"
                    value="parallel"
                    checked={sequenceType === "parallel"}
                    onChange={(e) => setSequenceType(e.target.value as "parallel")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Parallel</div>
                    <div className="text-sm text-slate-600">
                      All approvers can review simultaneously. Approval happens when minimum
                      percentage is met.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="min-percentage">Minimum approval percentage</Label>
                <span className="text-sm font-medium text-slate-900">{minApprovalPercentage}%</span>
              </div>
              <input
                type="range"
                id="min-percentage"
                min="1"
                max="100"
                step="1"
                value={minApprovalPercentage}
                onChange={(e) => setMinApprovalPercentage(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <p className="text-xs text-slate-500">
                {sequenceType === "parallel"
                  ? `Expense will be approved when ${minApprovalPercentage}% of approvers approve it.`
                  : "For sequential approval, this determines the minimum percentage of steps that must be completed."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Approval steps</CardTitle>
            <CardDescription>
              Define the sequence of approvers. Each step must be completed before moving to the
              next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {step.step_order}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`type-${step.id}`}>Approver type</Label>
                      <Select
                        value={step.approver_type}
                        onValueChange={(value) =>
                          updateStep(step.id, "approver_type", value as "ROLE" | "USER")
                        }
                      >
                        <SelectTrigger id={`type-${step.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROLE">Role (e.g., MANAGER, ADMIN)</SelectItem>
                          <SelectItem value="USER">Specific User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ref-${step.id}`}>
                        {step.approver_type === "ROLE" ? "Role" : "User ID/Email"}
                      </Label>
                      <Input
                        id={`ref-${step.id}`}
                        value={step.approver_ref}
                        onChange={(e) => updateStep(step.id, "approver_ref", e.target.value)}
                        placeholder={
                          step.approver_type === "ROLE"
                            ? "MANAGER, ADMIN, etc."
                            : "user@example.com"
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addStep} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add approval step
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Creating..." : "Create workflow"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/approval-flows")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>

      <Card className="border-slate-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
        <CardContent className="py-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">💡 Tips for creating workflows</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong>Role-based approvers:</strong> Use roles like MANAGER, ADMIN, or EMPLOYEE
                  for flexible routing based on user roles.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong>Sequential approval:</strong> Expenses will move through steps in order.
                  Each step must approve before proceeding.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong>Specific users:</strong> Choose USER type and provide an email or user ID
                  to assign to a specific person.
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
