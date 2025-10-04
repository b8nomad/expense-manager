"use client"

import { useEffect, useState } from "react"
import { Building2, Globe2, Shield, Wallet } from "lucide-react"
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
import { useCountryCurrencies, type CurrencyOption } from "@/hooks/use-country-currencies"

type Company = {
  id: string
  name: string
  country: string
  currency: string
  createdAt: string
  members: number
  approvalFlows: number
}

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("")
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([])
  
  const { countries, loading: loadingCountries, error: countriesError } = useCountryCurrencies()

  // Fetch company profile
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch("/api/admin/company")
        if (!response.ok) {
          throw new Error("Failed to fetch company profile")
        }
        const data = await response.json()
        setCompany(data.company)
        setCompanyName(data.company.name)
        setCountry(data.company.country)
        setCurrency(data.company.currency)
      } catch (error) {
        toast.error("Failed to load company profile")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompany()
  }, [])

  // Update available currencies when country changes
  useEffect(() => {
    if (countriesError) {
      return
    }

    if (!country) {
      setAvailableCurrencies([])
      return
    }

    const selected = countries.find((option) => option.value === country)
    if (!selected || selected.currencies.length === 0) {
      setAvailableCurrencies([])
      return
    }

    setAvailableCurrencies(selected.currencies)
    
    // Auto-select currency if only one is available
    if (selected.currencies.length === 1) {
      setCurrency(selected.currencies[0].code)
    } else if (!selected.currencies.some((c) => c.code === currency)) {
      // Reset currency if it's not valid for the new country
      setCurrency("")
    }
  }, [country, countries, countriesError, currency])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      if (!companyName.trim()) {
        toast.error("Company name is required")
        setIsSaving(false)
        return
      }

      if (!country.trim()) {
        toast.error("Country is required")
        setIsSaving(false)
        return
      }

      if (!currency.trim()) {
        toast.error("Currency is required")
        setIsSaving(false)
        return
      }

      const response = await fetch("/api/admin/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: companyName,
          country,
          currency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update company settings")
      }

      setCompany(data.company)
      toast.success(data.message || "Company settings updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-600">Loading settings...</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-red-600">Failed to load company profile</p>
      </div>
    )
  }

  const hasChanges = 
    companyName !== company.name ||
    country !== company.country ||
    currency !== company.currency

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Company settings</h2>
          <p className="text-sm text-slate-600">
            Configure defaults for currency, reimbursements, and integration rules that power expense
            automation.
          </p>
        </div>
        <Button 
          size="sm" 
          className="gap-2"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          <Shield className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Company profile</CardTitle>
            <CardDescription className="text-slate-600">
              This information is visible to employees when they submit expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input 
                id="company-name" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              {countriesError ? (
                <>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                  <p className="text-xs text-destructive">{countriesError}</p>
                </>
              ) : (
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
              )}
            </div>
            <div className="space-y-2">
              <Label>Team size</Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                {company.members} {company.members === 1 ? "member" : "members"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Approval flows configured</Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                {company.approvalFlows} {company.approvalFlows === 1 ? "flow" : "flows"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Currency & conversions</CardTitle>
            <CardDescription className="text-slate-600">
              Employees can submit in any currency; we convert with live rates for reviewers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-currency">Default company currency</Label>
              {countriesError ? (
                <Input
                  id="default-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              ) : (
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
                          ? "No currencies available"
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
              )}
              <p className="text-xs text-slate-500">
                This currency will be used as the default for expense reporting and approvals.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Company joined</Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                {new Date(company.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
