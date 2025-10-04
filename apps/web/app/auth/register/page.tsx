"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getHomePathForRole } from "@/lib/auth"
import { useCountryCurrencies, type CurrencyOption } from "@/hooks/use-country-currencies"

import { registerAction, type AuthFormState } from "../actions"

const initialState: AuthFormState = { status: "idle" }

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </span>
      ) : (
        "Create account"
      )}
    </Button>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const hasHandledSuccess = useRef(false)
  const { countries, loading: loadingCountries, error: countriesError } = useCountryCurrencies()
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("")
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([])
  const [state, formAction] = useActionState(registerAction, initialState)

  useEffect(() => {
    if (state.status === "success" && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true
      toast.success(state.message ?? "Account created successfully")
      formRef.current?.reset()
      setCountry("")
      setCurrency("")
      setAvailableCurrencies([])
      router.replace(getHomePathForRole(state.role))
    }

    if (state.status === "error") {
      hasHandledSuccess.current = false
      if (state.message) {
        toast.error(state.message)
      }
    }
  }, [state, router])

  useEffect(() => {
    if (countriesError) {
      setAvailableCurrencies([])
      return
    }

    if (!country) {
      setAvailableCurrencies([])
      setCurrency("")
      return
    }

    const selected = countries.find((option) => option.value === country)
    const nextCurrencies = selected?.currencies ?? []

    setAvailableCurrencies(nextCurrencies)

    if (nextCurrencies.length === 0) {
      setCurrency("")
      return
    }

    setCurrency((previous) => {
      const stillValid = nextCurrencies.some((option) => option.code === previous)
      return stillValid ? previous : nextCurrencies[0].code
    })
  }, [country, countries, countriesError])

  const isReadyToSubmit = Boolean(country && currency)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-2xl border border-slate-200 bg-white shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl text-slate-900">Create your workspace</CardTitle>
          <CardDescription className="text-slate-600">
            Set up your company account to start managing expenses, approvals, and teams in one
            place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userName">Full name</Label>
              <Input
                id="userName"
                name="userName"
                placeholder="Jordan Lee"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a secure password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Acme Inc."
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              {countriesError ? (
                <>
                  <Input
                    id="country"
                    name="country"
                    placeholder="United States"
                    autoComplete="country-name"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    required
                  />
                  <p className="text-xs text-destructive">{countriesError}</p>
                </>
              ) : (
                <>
                  <Select
                    value={country || undefined}
                    onValueChange={setCountry}
                    disabled={loadingCountries}
                  >
                    <SelectTrigger className="w-full justify-between border border-slate-200 bg-white">
                      <SelectValue
                        placeholder={
                          loadingCountries ? "Loading countries..." : "Select your country"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="country" value={country} />
                </>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Default currency</Label>
              {countriesError ? (
                <Input
                  name="currency"
                  placeholder="Currency code (e.g., USD)"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  required
                />
              ) : (
                <>
                  <Select
                    value={currency || undefined}
                    onValueChange={setCurrency}
                    disabled={country === "" || availableCurrencies.length === 0}
                  >
                    <SelectTrigger className="w-full justify-between border border-slate-200 bg-white">
                      <SelectValue
                        placeholder={
                          country === ""
                            ? "Select a country first"
                            : availableCurrencies.length === 0
                            ? "Enter a currency code"
                            : "Select a currency"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="currency" value={currency} />
                  {country && availableCurrencies.length === 0 ? (
                    <Input
                      className="mt-2"
                      placeholder="Currency code (e.g., USD)"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                      required
                    />
                  ) : null}
                </>
              )}
            </div>

            {state.status === "error" && state.message ? (
              <div className="md:col-span-2">
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.message}
                </p>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <SubmitButton label="Creating your workspace" disabled={!isReadyToSubmit} />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex w-full items-center justify-center gap-2 text-xs">
            <span>Already have an account?</span>
            <Button variant="link" className="px-0" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}