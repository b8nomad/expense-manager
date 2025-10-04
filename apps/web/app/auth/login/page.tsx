"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getHomePathForRole } from "@/lib/auth"

import { loginAction, type AuthFormState } from "../actions"

const initialState: AuthFormState = { status: "idle" }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </span>
      ) : (
        "Sign in"
      )}
    </Button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")
  const formRef = useRef<HTMLFormElement>(null)
  const hasHandledSuccess = useRef(false)
  const [state, formAction] = useActionState(loginAction, initialState)

  useEffect(() => {
    if (state.status === "success" && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true
      const target = redirectTo ?? getHomePathForRole(state.role)
      toast.success(state.message ?? "Logged in successfully")
      formRef.current?.reset()
      router.replace(target)
    }

    if (state.status === "error") {
      hasHandledSuccess.current = false
      if (state.message) {
        toast.error(state.message)
      }
    }
  }, [state, router, redirectTo])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-slate-900">Welcome back</CardTitle>
          <CardDescription className="text-slate-600">
            Sign in to manage expenses, approvals, and company finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/register"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Need an account?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {redirectTo ? (
              <input type="hidden" name="redirectTo" value={redirectTo} />
            ) : null}

            {state.status === "error" && state.message ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {state.message}
              </p>
            ) : null}

            <SubmitButton label="Signing you in" />
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex w-full items-center justify-center gap-2 text-xs">
            <span>New to Expense Manager?</span>
            <Button variant="link" className="px-0" asChild>
              <Link href="/auth/register">Create an account</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}