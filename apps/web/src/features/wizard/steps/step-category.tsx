'use client'

import {
  CATEGORIES_MAIN,
  CATEGORY_BYTY_ID,
  DISPOSITIONS,
  DISPOSITION_LABELS,
  TRANSACTION_LABELS,
  TRANSACTION_TYPES,
  subcategoriesOf,
} from '@rocket/shared'
import type { TransactionType } from '@rocket/shared'
import { Boxes, Building2, Gavel, Home, KeyRound, LandPlot, Store, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StepProps } from '../types'

const TRANSACTION_ICONS: Record<TransactionType, LucideIcon> = {
  prodej: Tag,
  pronajem: KeyRound,
  drazba: Gavel,
}

const CATEGORY_ICONS: Record<number, LucideIcon> = {
  1: Building2,
  2: Home,
  3: LandPlot,
  4: Store,
  5: Boxes,
}

interface OptionCardProps {
  selected: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
}

function OptionCard({ selected, onClick, icon: Icon, label }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex flex-col items-center gap-2 rounded-md border p-4 text-sm font-medium transition-colors',
        selected
          ? 'border-brand-400 bg-brand-50 text-heading'
          : 'border-border bg-surface hover:bg-muted',
      )}
    >
      <Icon className={cn('size-6', selected ? 'text-brand-500' : 'text-muted-foreground')} />
      {label}
    </button>
  )
}

interface ChoiceChipProps {
  selected: boolean
  onClick: () => void
  label: string
}

function ChoiceChip({ selected, onClick, label }: ChoiceChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'border-brand-400 bg-brand-50 text-brand-700'
          : 'border-border bg-surface text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}

export function StepCategory({ data, onChange }: StepProps) {
  const subcategories = data.categoryMainId ? subcategoriesOf(data.categoryMainId) : []
  const isByty = data.categoryMainId === CATEGORY_BYTY_ID

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-heading">Typ nabídky</h3>
        <div className="grid grid-cols-3 gap-3">
          {TRANSACTION_TYPES.map((transaction) => (
            <OptionCard
              key={transaction}
              selected={data.transaction === transaction}
              onClick={() => onChange({ transaction })}
              icon={TRANSACTION_ICONS[transaction]}
              label={TRANSACTION_LABELS[transaction]}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-heading">Kategorie nemovitosti</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CATEGORIES_MAIN.map((category) => (
            <OptionCard
              key={category.id}
              selected={data.categoryMainId === category.id}
              onClick={() =>
                onChange({ categoryMainId: category.id, categorySubId: null, disposition: null })
              }
              icon={CATEGORY_ICONS[category.id] ?? Boxes}
              label={category.name}
            />
          ))}
        </div>
      </section>

      {!isByty && subcategories.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">Upřesnění</h3>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <ChoiceChip
                key={sub.id}
                selected={data.categorySubId === sub.id}
                onClick={() =>
                  onChange({ categorySubId: data.categorySubId === sub.id ? null : sub.id })
                }
                label={sub.name}
              />
            ))}
          </div>
        </section>
      )}

      {isByty && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">
            Dispozice<span className="text-destructive"> *</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {DISPOSITIONS.map((disposition) => (
              <ChoiceChip
                key={disposition}
                selected={data.disposition === disposition}
                onClick={() => onChange({ disposition })}
                label={DISPOSITION_LABELS[disposition]}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
