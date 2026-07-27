import {
  BUILDING_CONDITION_LABELS,
  BUILDING_TYPE_LABELS,
  DISPOSITION_LABELS,
  FURNISHING_LABELS,
  ORIENTATION_LABELS,
  OWNERSHIP_LABELS,
  formatArea,
} from '@rocket/shared'
import type { ReactNode } from 'react'

import { EnergyLabelBadge } from './energy-label-badge'
import type { ListingRow } from './queries'

interface ParameterRow {
  label: string
  value: ReactNode
}

const dateFormatter = new Intl.DateTimeFormat('cs-CZ')

function formatFloor(listing: ListingRow): string | null {
  if (listing.floorNumber === null) return null
  const base = `${listing.floorNumber}. podlaží`
  return listing.floorsTotal !== null ? `${base} z ${listing.floorsTotal}` : base
}

function formatFeature(hasFeature: boolean, area: number | null): string | null {
  if (!hasFeature) return null
  return area !== null ? `Ano (${formatArea(area)})` : 'Ano'
}

function formatCountedFeature(hasFeature: boolean, count: number | null): string | null {
  if (!hasFeature) return null
  return count !== null && count > 1 ? `Ano (${count}×)` : 'Ano'
}

function pushRow(rows: ParameterRow[], label: string, value: ReactNode) {
  if (value === null || value === undefined || value === false || value === '') return
  rows.push({ label, value })
}

function buildParameterRows(listing: ListingRow): ParameterRow[] {
  const rows: ParameterRow[] = []
  pushRow(rows, 'Dispozice', listing.disposition && DISPOSITION_LABELS[listing.disposition])
  pushRow(rows, 'Užitná plocha', listing.areaUsable !== null && formatArea(listing.areaUsable))
  pushRow(rows, 'Zastavěná plocha', listing.areaBuiltUp !== null && formatArea(listing.areaBuiltUp))
  pushRow(rows, 'Plocha pozemku', listing.areaLand !== null && formatArea(listing.areaLand))
  pushRow(rows, 'Plocha zahrady', listing.areaGarden !== null && formatArea(listing.areaGarden))
  pushRow(rows, 'Podlaží', formatFloor(listing))
  pushRow(rows, 'Vlastnictví', listing.ownership && OWNERSHIP_LABELS[listing.ownership])
  pushRow(rows, 'Typ stavby', listing.buildingType && BUILDING_TYPE_LABELS[listing.buildingType])
  pushRow(
    rows,
    'Stav nemovitosti',
    listing.buildingCondition && BUILDING_CONDITION_LABELS[listing.buildingCondition],
  )
  pushRow(rows, 'Zařízení', listing.furnishing && FURNISHING_LABELS[listing.furnishing])
  pushRow(rows, 'Energetická třída', <EnergyLabelBadge label={listing.energyLabel} />)
  pushRow(rows, 'Balkón', formatFeature(listing.hasBalcony, listing.balconyArea))
  pushRow(rows, 'Terasa', formatFeature(listing.hasTerrace, listing.terraceArea))
  pushRow(rows, 'Lodžie', formatFeature(listing.hasLoggia, listing.loggiaArea))
  pushRow(rows, 'Sklep', formatFeature(listing.hasCellar, listing.cellarArea))
  pushRow(rows, 'Výtah', listing.hasElevator ? 'Ano' : null)
  pushRow(rows, 'Garáž', formatCountedFeature(listing.hasGarage, listing.garageCount))
  pushRow(rows, 'Parkování', formatCountedFeature(listing.hasParking, listing.parkingCount))
  pushRow(rows, 'Bezbariérový přístup', listing.barrierFree ? 'Ano' : null)
  pushRow(
    rows,
    'Orientace',
    listing.orientation?.length
      ? listing.orientation.map((value) => ORIENTATION_LABELS[value]).join(', ')
      : null,
  )
  pushRow(
    rows,
    'K dispozici od',
    listing.availableFrom && dateFormatter.format(new Date(listing.availableFrom)),
  )
  return rows
}

/** Tabulka parametrů — zobrazuje jen vyplněné hodnoty. */
export function ParametersTable({ listing }: { listing: ListingRow }) {
  const rows = buildParameterRows(listing)
  if (rows.length === 0) return null
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-2 items-center gap-4 px-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium text-heading">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
