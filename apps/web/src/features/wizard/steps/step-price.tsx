'use client'

import {
  ADDRESS_VISIBILITY_LABELS,
  CATEGORY_MAIN_BY_ID,
  CATEGORY_SUB_BY_ID,
  DISPOSITION_LABELS,
  FURNISHING_LABELS,
  TRANSACTION_LABELS,
  formatArea,
  formatPrice,
} from '@rocket/shared'
import { AlertCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Field, NumberField } from '../fields'
import { CATEGORY_POZEMKY_ID, WIZARD_STEPS, parseOptionalNumber } from '../types'
import type { StepProps, SubmitErrorItem, WizardData } from '../types'

interface StepPriceProps extends StepProps {
  municipalityName: string | null
  photoCount: number
  submitErrors: SubmitErrorItem[]
}

interface SummaryEntry {
  label: string
  value: string
}

function buildSummaryEntries(
  data: WizardData,
  municipalityName: string | null,
  photoCount: number,
): SummaryEntry[] {
  const entries: SummaryEntry[] = []

  if (data.transaction) {
    entries.push({ label: 'Typ nabídky', value: TRANSACTION_LABELS[data.transaction] })
  }
  if (data.categoryMainId) {
    const main = CATEGORY_MAIN_BY_ID.get(data.categoryMainId)?.name ?? '—'
    const sub = data.categorySubId ? CATEGORY_SUB_BY_ID.get(data.categorySubId)?.name : null
    entries.push({ label: 'Kategorie', value: sub ? `${main} — ${sub}` : main })
  }
  if (data.disposition) {
    entries.push({ label: 'Dispozice', value: DISPOSITION_LABELS[data.disposition] })
  }

  const addressParts = [
    [data.street, data.streetNumber].filter(Boolean).join(' '),
    municipalityName,
  ].filter(Boolean)
  if (addressParts.length > 0) {
    entries.push({ label: 'Lokalita', value: addressParts.join(', ') })
  }
  entries.push({
    label: 'Viditelnost adresy',
    value: ADDRESS_VISIBILITY_LABELS[data.addressVisibility],
  })

  const isPozemky = data.categoryMainId === CATEGORY_POZEMKY_ID
  const areaUsable = parseOptionalNumber(data.areaUsable)
  const areaLand = parseOptionalNumber(data.areaLand)
  if (!isPozemky && areaUsable) {
    entries.push({ label: 'Užitná plocha', value: formatArea(areaUsable) })
  }
  if (areaLand) {
    entries.push({ label: 'Plocha pozemku', value: formatArea(areaLand) })
  }
  if (data.furnishing) {
    entries.push({ label: 'Zařízenost', value: FURNISHING_LABELS[data.furnishing] })
  }

  if (data.title.trim()) {
    entries.push({ label: 'Titulek', value: data.title.trim() })
  }
  entries.push({ label: 'Fotografie', value: `${photoCount}` })

  return entries
}

export function StepPrice({
  data,
  onChange,
  municipalityName,
  photoCount,
  submitErrors,
}: StepPriceProps) {
  const isRent = data.transaction === 'pronajem'
  const priceUnit = isRent ? ('za_mesic' as const) : ('celkem' as const)
  const formattedPrice = formatPrice({
    amount: parseOptionalNumber(data.priceAmount),
    currency: 'CZK',
    unit: priceUnit,
    hidden: data.priceHidden,
  })
  const summaryEntries = buildSummaryEntries(data, municipalityName, photoCount)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-heading">Cena</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={data.priceHidden ? 'opacity-50' : undefined}>
            <NumberField
              id="priceAmount"
              label={isRent ? 'Cena za měsíc' : 'Cena celkem'}
              unit={isRent ? 'Kč/měs' : 'Kč'}
              required={!data.priceHidden}
              value={data.priceAmount}
              onChange={(priceAmount) => onChange({ priceAmount })}
            />
          </div>
          <Field id="priceNote" label="Poznámka k ceně (volitelné)">
            <Input
              id="priceNote"
              value={data.priceNote}
              placeholder={isRent ? 'např. + energie a poplatky' : 'např. včetně provize'}
              onChange={(event) => onChange({ priceNote: event.target.value })}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="priceHidden"
            checked={data.priceHidden}
            onCheckedChange={(state) => onChange({ priceHidden: state === true })}
          />
          <Label htmlFor="priceHidden" className="cursor-pointer">
            Nezveřejňovat cenu (zájemci uvidí „Info o ceně u inzerenta")
          </Label>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-heading">Souhrn inzerátu</h3>
        <dl className="flex flex-col gap-2">
          {summaryEntries.map((entry) => (
            <div key={entry.label} className="grid grid-cols-[150px_1fr] gap-2 text-sm">
              <dt className="text-muted-foreground">{entry.label}</dt>
              <dd className="text-heading">{entry.value}</dd>
            </div>
          ))}
          <div className="grid grid-cols-[150px_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">Cena</dt>
            <dd className="font-semibold text-heading">{formattedPrice}</dd>
          </div>
        </dl>
        {data.description.trim() && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{data.description.trim()}</p>
        )}
      </section>

      {submitErrors.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive-bg p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            Před odesláním prosím opravte:
          </p>
          <ul className="flex flex-col gap-1 pl-6 text-sm text-destructive">
            {submitErrors.map((error, index) => {
              const stepTitle = WIZARD_STEPS.find((step) => step.id === error.step)?.title
              return (
                <li key={index} className="list-disc">
                  {stepTitle ? `Krok ${error.step} (${stepTitle}): ` : ''}
                  {error.message}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Odesláním projde inzerát rychlou kontrolou moderátora. Publikace na 30 dní je zdarma.
      </p>
    </div>
  )
}
