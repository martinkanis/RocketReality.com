'use client'

import { X } from 'lucide-react'

export interface FilterChip {
  id: string
  label: string
  onRemove: () => void
}

/** Aktivní filtry jako odebratelné štítky nad výsledky. */
export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Aktivní filtry">
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="flex items-center gap-1 rounded-sm bg-brand-100 py-1 pr-1 pl-2.5 text-xs font-medium text-brand-700"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Zrušit filtr ${chip.label}`}
            className="rounded-sm p-0.5 transition-colors outline-none hover:bg-brand-200 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={chip.onRemove}
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}
