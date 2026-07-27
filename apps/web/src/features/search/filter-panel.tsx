'use client'

import {
  BUILDING_CONDITIONS,
  BUILDING_CONDITION_LABELS,
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_LABELS,
  FURNISHING_TYPES,
  OWNERSHIP_LABELS,
  OWNERSHIP_TYPES,
  type BuildingCondition,
  type BuildingType,
  type Disposition,
  type EnergyLabel,
  type FurnishingType,
  type OwnershipType,
} from '@rocket/shared'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQueryStates } from 'nuqs'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { FilterChips, type FilterChip } from './filter-chips'
import {
  searchFilterParsers,
  searchFilterUrlKeys,
  serializeSearchFilters,
  type SearchFilterValues,
} from './query-params'

const ENERGY_ANY_VALUE = 'nerozhoduje'

const FEATURE_KEYS = ['balkon', 'terasa', 'sklep', 'vytah', 'garaz', 'parkovani'] as const
type FeatureKey = (typeof FEATURE_KEYS)[number]

const FEATURE_LABELS: Record<FeatureKey, string> = {
  balkon: 'Balkón',
  terasa: 'Terasa',
  sklep: 'Sklep',
  vytah: 'Výtah',
  garaz: 'Garáž',
  parkovani: 'Parkování',
}

interface FilterPanelProps {
  /** Cesta výpisu bez segmentu dispozice (lokalita zůstává), např. „/prodej/byty/brno". */
  basePath: string
  /** Cesta výpisu bez dispozice i lokality, např. „/prodej/byty". */
  categoryPath: string
  pathDisposition: Disposition | null
  locationName: string | null
  isByty: boolean
  isPronajem: boolean
}

interface FilterDraft {
  dispozice: Disposition[]
  cenaOd: string
  cenaDo: string
  plochaOd: string
  plochaDo: string
  vlastnictvi: OwnershipType[]
  stavba: BuildingType[]
  stav: BuildingCondition[]
  zarizeni: FurnishingType[]
  energieMax: EnergyLabel | null
  balkon: boolean
  terasa: boolean
  sklep: boolean
  vytah: boolean
  garaz: boolean
  parkovani: boolean
  hledat: string
}

function createDraft(values: SearchFilterValues, pathDisposition: Disposition | null): FilterDraft {
  return {
    dispozice: values.dispozice ?? (pathDisposition ? [pathDisposition] : []),
    cenaOd: values.cenaOd?.toString() ?? '',
    cenaDo: values.cenaDo?.toString() ?? '',
    plochaOd: values.plochaOd?.toString() ?? '',
    plochaDo: values.plochaDo?.toString() ?? '',
    vlastnictvi: values.vlastnictvi ?? [],
    stavba: values.stavba ?? [],
    stav: values.stav ?? [],
    zarizeni: values.zarizeni ?? [],
    energieMax: values.energieMax,
    balkon: values.balkon ?? false,
    terasa: values.terasa ?? false,
    sklep: values.sklep ?? false,
    vytah: values.vytah ?? false,
    garaz: values.garaz ?? false,
    parkovani: values.parkovani ?? false,
    hledat: values.hledat ?? '',
  }
}

function parseDraftNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number.parseInt(value.trim(), 10) : null
}

function draftToValues(draft: FilterDraft): Partial<SearchFilterValues> {
  return {
    dispozice: draft.dispozice.length > 0 ? draft.dispozice : null,
    cenaOd: parseDraftNumber(draft.cenaOd),
    cenaDo: parseDraftNumber(draft.cenaDo),
    plochaOd: parseDraftNumber(draft.plochaOd),
    plochaDo: parseDraftNumber(draft.plochaDo),
    vlastnictvi: draft.vlastnictvi.length > 0 ? draft.vlastnictvi : null,
    stavba: draft.stavba.length > 0 ? draft.stavba : null,
    stav: draft.stav.length > 0 ? draft.stav : null,
    zarizeni: draft.zarizeni.length > 0 ? draft.zarizeni : null,
    energieMax: draft.energieMax,
    balkon: draft.balkon ? true : null,
    terasa: draft.terasa ? true : null,
    sklep: draft.sklep ? true : null,
    vytah: draft.vytah ? true : null,
    garaz: draft.garaz ? true : null,
    parkovani: draft.parkovani ? true : null,
    hledat: draft.hledat.trim() ? draft.hledat.trim() : null,
  }
}

const priceFormatter = new Intl.NumberFormat('cs-CZ')

function formatRangeChip(prefix: string, from: number | null, to: number | null, unit: string) {
  if (from !== null && to !== null) {
    return `${prefix} ${priceFormatter.format(from)} – ${priceFormatter.format(to)} ${unit}`
  }
  if (from !== null) return `${prefix} od ${priceFormatter.format(from)} ${unit}`
  return `${prefix} do ${priceFormatter.format(to ?? 0)} ${unit}`
}

export function FilterPanel(props: FilterPanelProps) {
  const router = useRouter()
  const [values, setValues] = useQueryStates(searchFilterParsers, {
    urlKeys: searchFilterUrlKeys,
    shallow: false,
    history: 'push',
  })
  const [draft, setDraft] = useState(() => createDraft(values, props.pathDisposition))
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Po navigaci (chip, tlačítko zpět) srovná rozpracovaný formulář se stavem v URL.
  useEffect(() => {
    setDraft(createDraft(values, props.pathDisposition))
  }, [values, props.pathDisposition])

  const appliedDispositions =
    values.dispozice ?? (props.pathDisposition ? [props.pathDisposition] : null)

  /**
   * Aplikuje filtry do URL (SSR refetch). Pokud je dispozice v cestě nebo se
   * mění cesta (zrušení lokality), naviguje na novou cestu s filtry v query.
   */
  function applyValues(patch: Partial<SearchFilterValues>, targetPath?: string) {
    const path = targetPath ?? (props.pathDisposition ? props.basePath : null)
    if (path) {
      router.push(
        serializeSearchFilters(path, {
          ...values,
          dispozice: appliedDispositions,
          ...patch,
          strana: null,
        }),
      )
      return
    }
    void setValues({ ...patch, strana: null })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyValues(draftToValues(draft))
  }

  function updateDraft(patch: Partial<FilterDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function updateFeatureDraft(key: FeatureKey, checked: boolean) {
    setDraft((current) => {
      const next = { ...current }
      next[key] = checked
      return next
    })
  }

  const chips = buildChips(props, values, appliedDispositions, applyValues)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <FilterChips chips={chips} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          value={draft.hledat}
          onChange={(event) => updateDraft({ hledat: event.target.value })}
          placeholder="Hledat v textu inzerátu…"
          aria-label="Fulltextové hledání"
        />
        {props.isByty && (
          <CheckboxGroup
            legend="Dispozice"
            options={DISPOSITIONS.map((value) => ({ value, label: value }))}
            selected={draft.dispozice}
            onChange={(dispozice) => updateDraft({ dispozice })}
          />
        )}
        <RangeInputs
          legend="Cena (Kč)"
          from={draft.cenaOd}
          to={draft.cenaDo}
          onChange={(cenaOd, cenaDo) => updateDraft({ cenaOd, cenaDo })}
        />
        <RangeInputs
          legend="Plocha (m²)"
          from={draft.plochaOd}
          to={draft.plochaDo}
          onChange={(plochaOd, plochaDo) => updateDraft({ plochaOd, plochaDo })}
        />
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-brand-500 transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={showMoreFilters}
          onClick={() => setShowMoreFilters((open) => !open)}
        >
          Další filtry
          <ChevronDown
            className={cn('size-4 transition-transform', showMoreFilters && 'rotate-180')}
          />
        </button>
        {showMoreFilters && (
          <div className="flex flex-col gap-5">
            <CheckboxGroup
              legend="Vlastnictví"
              options={OWNERSHIP_TYPES.map((value) => ({
                value,
                label: OWNERSHIP_LABELS[value],
              }))}
              selected={draft.vlastnictvi}
              onChange={(vlastnictvi) => updateDraft({ vlastnictvi })}
            />
            <CheckboxGroup
              legend="Typ stavby"
              options={BUILDING_TYPES.map((value) => ({
                value,
                label: BUILDING_TYPE_LABELS[value],
              }))}
              selected={draft.stavba}
              onChange={(stavba) => updateDraft({ stavba })}
            />
            <CheckboxGroup
              legend="Stav nemovitosti"
              options={BUILDING_CONDITIONS.map((value) => ({
                value,
                label: BUILDING_CONDITION_LABELS[value],
              }))}
              selected={draft.stav}
              onChange={(stav) => updateDraft({ stav })}
            />
            <EnergyLabelSelect
              value={draft.energieMax}
              onChange={(energieMax) => updateDraft({ energieMax })}
            />
            <FieldGroup legend="Vybavení">
              {FEATURE_KEYS.map((key) => (
                <CheckboxRow
                  key={key}
                  label={FEATURE_LABELS[key]}
                  checked={draft[key]}
                  onChange={(checked) => updateFeatureDraft(key, checked)}
                />
              ))}
            </FieldGroup>
            {props.isPronajem && (
              <CheckboxGroup
                legend="Zařízení"
                options={FURNISHING_TYPES.map((value) => ({
                  value,
                  label: FURNISHING_LABELS[value],
                }))}
                selected={draft.zarizeni}
                onChange={(zarizeni) => updateDraft({ zarizeni })}
              />
            )}
          </div>
        )}
        <Button type="submit">Použít filtry</Button>
      </form>
    </div>
  )
}

function buildChips(
  props: FilterPanelProps,
  values: SearchFilterValues,
  appliedDispositions: Disposition[] | null,
  applyValues: (patch: Partial<SearchFilterValues>, targetPath?: string) => void,
): FilterChip[] {
  const chips: FilterChip[] = []

  if (props.locationName) {
    chips.push({
      id: 'lokalita',
      label: props.locationName,
      onRemove: () => applyValues({}, props.categoryPath),
    })
  }
  for (const disposition of appliedDispositions ?? []) {
    chips.push({
      id: `dispozice-${disposition}`,
      label: `Dispozice ${disposition}`,
      onRemove: () => {
        const remaining = (appliedDispositions ?? []).filter((value) => value !== disposition)
        applyValues({ dispozice: remaining.length > 0 ? remaining : null })
      },
    })
  }
  if (values.cenaOd !== null || values.cenaDo !== null) {
    chips.push({
      id: 'cena',
      label: formatRangeChip('Cena', values.cenaOd, values.cenaDo, 'Kč'),
      onRemove: () => applyValues({ cenaOd: null, cenaDo: null }),
    })
  }
  if (values.plochaOd !== null || values.plochaDo !== null) {
    chips.push({
      id: 'plocha',
      label: formatRangeChip('Plocha', values.plochaOd, values.plochaDo, 'm²'),
      onRemove: () => applyValues({ plochaOd: null, plochaDo: null }),
    })
  }
  appendEnumChips(chips, 'vlastnictvi', values.vlastnictvi, OWNERSHIP_LABELS, (vlastnictvi) =>
    applyValues({ vlastnictvi }),
  )
  appendEnumChips(chips, 'stavba', values.stavba, BUILDING_TYPE_LABELS, (stavba) =>
    applyValues({ stavba }),
  )
  appendEnumChips(chips, 'stav', values.stav, BUILDING_CONDITION_LABELS, (stav) =>
    applyValues({ stav }),
  )
  appendEnumChips(chips, 'zarizeni', values.zarizeni, FURNISHING_LABELS, (zarizeni) =>
    applyValues({ zarizeni }),
  )
  if (values.energieMax) {
    chips.push({
      id: 'energie',
      label: `Energetická třída ${values.energieMax} a lepší`,
      onRemove: () => applyValues({ energieMax: null }),
    })
  }
  for (const key of FEATURE_KEYS) {
    if (values[key]) {
      chips.push({
        id: key,
        label: FEATURE_LABELS[key],
        onRemove: () => applyValues(clearFeaturePatch(key)),
      })
    }
  }
  if (values.hledat) {
    chips.push({
      id: 'hledat',
      label: `„${values.hledat}“`,
      onRemove: () => applyValues({ hledat: null }),
    })
  }
  return chips
}

function clearFeaturePatch(key: FeatureKey): Partial<SearchFilterValues> {
  const patch: Partial<SearchFilterValues> = {}
  patch[key] = null
  return patch
}

function appendEnumChips<T extends string>(
  chips: FilterChip[],
  idPrefix: string,
  selected: T[] | null,
  labels: Record<T, string>,
  onRemove: (remaining: T[] | null) => void,
) {
  for (const value of selected ?? []) {
    chips.push({
      id: `${idPrefix}-${value}`,
      label: labels[value],
      onRemove: () => {
        const remaining = (selected ?? []).filter((item) => item !== value)
        onRemove(remaining.length > 0 ? remaining : null)
      },
    })
  }
}

function FieldGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-heading">{legend}</legend>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">{children}</div>
    </fieldset>
  )
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(state) => onChange(state === true)} />
      {label}
    </label>
  )
}

function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string
  options: { value: T; label: string }[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  return (
    <FieldGroup legend={legend}>
      {options.map((option) => (
        <CheckboxRow
          key={option.value}
          label={option.label}
          checked={selected.includes(option.value)}
          onChange={(checked) =>
            onChange(
              checked
                ? [...selected, option.value]
                : selected.filter((value) => value !== option.value),
            )
          }
        />
      ))}
    </FieldGroup>
  )
}

function RangeInputs({
  legend,
  from,
  to,
  onChange,
}: {
  legend: string
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-heading">{legend}</legend>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          placeholder="Od"
          aria-label={`${legend} od`}
          value={from}
          onChange={(event) => onChange(event.target.value, to)}
        />
        <Input
          inputMode="numeric"
          placeholder="Do"
          aria-label={`${legend} do`}
          value={to}
          onChange={(event) => onChange(from, event.target.value)}
        />
      </div>
    </fieldset>
  )
}

function EnergyLabelSelect({
  value,
  onChange,
}: {
  value: EnergyLabel | null
  onChange: (value: EnergyLabel | null) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-heading">Energetická třída (max.)</span>
      <Select
        value={value ?? ENERGY_ANY_VALUE}
        onValueChange={(selected) =>
          onChange(ENERGY_LABELS.find((label) => label === selected) ?? null)
        }
      >
        <SelectTrigger aria-label="Maximální energetická třída">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ENERGY_ANY_VALUE}>Nerozhoduje</SelectItem>
          {ENERGY_LABELS.map((label) => (
            <SelectItem key={label} value={label}>
              {label} a lepší
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
