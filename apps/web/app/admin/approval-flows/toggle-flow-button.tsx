"use client"

import { useState } from "react"
import { Power } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ToggleFlowButtonProps = {
  flowId: string
  flowName: string
  isActive: boolean
}

export function ToggleFlowButton({ flowId, flowName, isActive }: ToggleFlowButtonProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)

    try {
      const response = await fetch(`/api/approval-flows/${flowId}/toggle`, {
        method: "PATCH",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle approval flow")
      }

      toast.success(data.message || "Approval flow status updated")

      // Refresh the page to show the updated status
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle approval flow")
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
      onClick={handleToggle}
      disabled={isToggling}
    >
      <Power className="h-3.5 w-3.5" />
      {isToggling ? "..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  )
}
