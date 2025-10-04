"use client"

import { useEffect, useMemo, useState } from "react"

const COUNTRY_CURRENCY_API = "https://restcountries.com/v3.1/all?fields=name,currencies"

type ApiCountry = {
  name?: {
    common?: string
  }
  currencies?: Record<string, { name?: string; symbol?: string }>
}

export type CurrencyOption = {
  code: string
  name: string
  symbol?: string
  label: string
}

export type CountryOption = {
  value: string
  label: string
  currencies: CurrencyOption[]
}

export function useCountryCurrencies() {
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchCountries() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(COUNTRY_CURRENCY_API)
        if (!response.ok) {
          throw new Error(`Failed to fetch countries: ${response.status}`)
        }

        const data = (await response.json()) as ApiCountry[]
        const normalized = data
          .filter((item) => item?.name?.common && item.currencies && Object.keys(item.currencies).length > 0)
          .map<CountryOption>((item) => {
            const currencies = Object.entries(item.currencies ?? {}).map(([code, info]) => {
              const name = info?.name ?? code
              const symbol = info?.symbol
              return {
                code,
                name,
                symbol,
                label: `${name} (${code})${symbol ? ` · ${symbol}` : ""}`,
              }
            })

            return {
              value: item.name!.common!,
              label: item.name!.common!,
              currencies: currencies.sort((a, b) => a.name.localeCompare(b.name)),
            }
          })
          .sort((a, b) => a.label.localeCompare(b.label))

        if (!active) return

        setCountries(normalized)
      } catch (err) {
        console.error("Failed to load country data", err)
        if (active) {
          setError("Unable to load country information. Please try again shortly.")
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchCountries()

    return () => {
      active = false
    }
  }, [])

  const countryMap = useMemo(() => {
    return new Map(countries.map((country) => [country.value, country.currencies]))
  }, [countries])

  return {
    countries,
    loading,
    error,
    countryMap,
  }
}
