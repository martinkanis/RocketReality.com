'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

interface AddressSuggestion {
  label: string
  key: string
}

export interface PickedAddress {
  street: string
  municipality: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  onPick: (address: PickedAddress) => void
}

/** Než se pošle dotaz do registru — uživatel adresu dopisuje po písmenech. */
const TYPING_PAUSE_MS = 250
const MIN_QUERY_LENGTH = 3

async function fetchSuggestions(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const response = await fetch(`/api/adresy?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) return []
  const data = (await response.json()) as { suggestions?: AddressSuggestion[] }
  return data.suggestions ?? []
}

async function fetchAddress(suggestion: AddressSuggestion): Promise<PickedAddress | null> {
  const params = new URLSearchParams({ key: suggestion.key, label: suggestion.label })
  const response = await fetch(`/api/adresy?${params.toString()}`)
  if (!response.ok) return null
  const data = (await response.json()) as { address?: PickedAddress | null }
  return data.address ?? null
}

/**
 * Našeptávač adres nad státním registrem. Vybraná adresa doplní ulici s číslem
 * a přesnou polohu; vyplnit adresu ručně jde pořád, registr je jen pomůcka.
 */
export function AddressAutocomplete({ onPick }: AddressAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)
      fetchSuggestions(trimmed, controller.signal)
        .then(setSuggestions)
        .catch(() => {
          // Přerušený nebo neúspěšný dotaz jen nenabídne návrhy; psaní pokračuje.
          setSuggestions([])
        })
        .finally(() => setIsLoading(false))
    }, TYPING_PAUSE_MS)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function handlePick(suggestion: AddressSuggestion) {
    setIsOpen(false)
    setQuery('')
    const address = await fetchAddress(suggestion)
    if (address) onPick(address)
  }

  return (
    <div className="relative">
      <Input
        id="addressSearch"
        value={query}
        placeholder="Např. Botanická 68, Brno"
        autoComplete="off"
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
      />
      {isOpen && query.trim().length >= MIN_QUERY_LENGTH && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-surface p-1 shadow-soft">
          {isLoading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Hledám…</li>
          )}
          {!isLoading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Adresu jsme nenašli — vyplňte ji ručně níže.
            </li>
          )}
          {suggestions.map((suggestion) => (
            <li key={suggestion.key}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void handlePick(suggestion)}
                className="w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
