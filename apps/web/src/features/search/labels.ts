import type { Disposition, TransactionType } from '@rocket/shared'

/** Genitivy kategorií pro nadpis výpisu („Prodej bytů", „Pronájem domů"). */
const CATEGORY_GENITIVES: Record<string, string> = {
  byty: 'bytů',
  domy: 'domů',
  pozemky: 'pozemků',
  komercni: 'komerčních prostor',
  ostatni: 'ostatních nemovitostí',
}

/** Nadpisové tvary transakce — u dražeb se ve výpisu hodí množné číslo. */
const TRANSACTION_HEADINGS: Record<TransactionType, string> = {
  prodej: 'Prodej',
  pronajem: 'Pronájem',
  drazba: 'Dražby',
}

export interface SearchHeadingParts {
  transaction: TransactionType
  categorySlug: string
  disposition?: Disposition | null
  locationName?: string | null
}

/** Nadpis výpisu, např. „Prodej bytů 2+kk Brno". */
export function buildSearchHeading(parts: SearchHeadingParts): string {
  const genitive = CATEGORY_GENITIVES[parts.categorySlug] ?? 'nemovitostí'
  const words = [`${TRANSACTION_HEADINGS[parts.transaction]} ${genitive}`]
  if (parts.disposition) words.push(parts.disposition)
  if (parts.locationName) words.push(parts.locationName)
  return words.join(' ')
}

const countFormatter = new Intl.NumberFormat('cs-CZ')

/** České skloňování: „1 inzerát", „3 inzeráty", „12 inzerátů". */
export function formatListingCount(count: number): string {
  const formatted = countFormatter.format(count)
  if (count === 1) return `${formatted} inzerát`
  if (count >= 2 && count <= 4) return `${formatted} inzeráty`
  return `${formatted} inzerátů`
}
