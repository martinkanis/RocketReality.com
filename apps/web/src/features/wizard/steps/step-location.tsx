'use client'

import { ADDRESS_VISIBILITIES, ADDRESS_VISIBILITY_LABELS } from '@rocket/shared'
import type { AddressVisibility } from '@rocket/shared'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Field } from '../fields'
import type { MunicipalityOption, StepProps } from '../types'

const VISIBILITY_HINTS: Record<AddressVisibility, string> = {
  presna: 'V inzerátu se zobrazí úplná adresa včetně čísla.',
  ulice: 'Zobrazí se jen ulice a obec, bez čísla.',
  obec: 'Zobrazí se pouze obec.',
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface MunicipalityComboboxProps {
  municipalities: MunicipalityOption[]
  selectedId: number | null
  onSelect: (municipalityId: number) => void
}

/** Jednoduchý searchable select — input filtruje seznam obcí podle názvu. */
function MunicipalityCombobox({ municipalities, selectedId, onSelect }: MunicipalityComboboxProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selected = municipalities.find((m) => m.id === selectedId) ?? null
  const normalizedQuery = normalizeForSearch(query.trim())
  const filtered = normalizedQuery
    ? municipalities.filter((m) => normalizeForSearch(m.name).includes(normalizedQuery))
    : municipalities

  function handleSelect(municipality: MunicipalityOption) {
    onSelect(municipality.id)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Input
        id="municipality"
        value={isOpen ? query : (selected?.name ?? '')}
        placeholder="Začněte psát název obce…"
        autoComplete="off"
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
        }}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-surface p-1 shadow-soft">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">Žádná obec neodpovídá</li>
          )}
          {filtered.map((municipality) => (
            <li key={municipality.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(municipality)}
                className={cn(
                  'flex w-full items-baseline justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  municipality.id === selectedId && 'bg-brand-50 text-brand-700',
                )}
              >
                <span className="font-medium text-heading">{municipality.name}</span>
                <span className="text-xs text-muted-foreground">
                  okres {municipality.districtName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface StepLocationProps extends StepProps {
  municipalities: MunicipalityOption[]
}

export function StepLocation({ data, onChange, municipalities }: StepLocationProps) {
  return (
    <div className="flex flex-col gap-6">
      <Field id="municipality" label="Obec" required>
        <MunicipalityCombobox
          municipalities={municipalities}
          selectedId={data.municipalityId}
          onSelect={(municipalityId) => onChange({ municipalityId })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
        <Field id="street" label="Ulice (volitelné)">
          <Input
            id="street"
            value={data.street}
            onChange={(event) => onChange({ street: event.target.value })}
          />
        </Field>
        <Field id="streetNumber" label="Číslo (volitelné)">
          <Input
            id="streetNumber"
            value={data.streetNumber}
            onChange={(event) => onChange({ streetNumber: event.target.value })}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm leading-none font-medium text-heading">
          Viditelnost adresy v inzerátu
        </legend>
        {ADDRESS_VISIBILITIES.map((visibility) => (
          <label
            key={visibility}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
              data.addressVisibility === visibility
                ? 'border-brand-400 bg-brand-50'
                : 'border-border hover:bg-muted',
            )}
          >
            <input
              type="radio"
              name="addressVisibility"
              value={visibility}
              checked={data.addressVisibility === visibility}
              onChange={() => onChange({ addressVisibility: visibility })}
              className="mt-0.5 accent-brand-500"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-heading">
                {ADDRESS_VISIBILITY_LABELS[visibility]}
              </span>
              <span className="text-xs text-muted-foreground">{VISIBILITY_HINTS[visibility]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="flex items-start gap-2 rounded-md bg-info-bg px-3 py-2.5 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        Polohu na mapě určíme automaticky podle zvolené obce.
      </p>
    </div>
  )
}
