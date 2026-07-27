import { DISPOSITIONS, type Disposition, type TransactionType } from '@rocket/shared'

/** URL segment transakce → DB hodnota (dražby mají v URL množné číslo). */
export const TRANSACTION_BY_URL_SEGMENT: ReadonlyMap<string, TransactionType> = new Map([
  ['prodej', 'prodej'],
  ['pronajem', 'pronajem'],
  ['drazby', 'drazba'],
])

export const TRANSACTION_URL_SEGMENTS: Record<TransactionType, string> = {
  prodej: 'prodej',
  pronajem: 'pronajem',
  drazba: 'drazby',
}

/** Dispozice → SEO slug v cestě výpisu („2+kk" → „2-kk", „6+" → „6-a-vice"). */
export const DISPOSITION_URL_SLUGS: Record<Disposition, string> = {
  '1+kk': '1-kk',
  '1+1': '1-1',
  '2+kk': '2-kk',
  '2+1': '2-1',
  '3+kk': '3-kk',
  '3+1': '3-1',
  '4+kk': '4-kk',
  '4+1': '4-1',
  '5+kk': '5-kk',
  '5+1': '5-1',
  '6+': '6-a-vice',
  atypicky: 'atypicky',
  pokoj: 'pokoj',
}

export const DISPOSITION_BY_URL_SLUG: ReadonlyMap<string, Disposition> = new Map(
  DISPOSITIONS.map((disposition) => [DISPOSITION_URL_SLUGS[disposition], disposition]),
)

export interface SearchPathParts {
  transaction: TransactionType
  categorySlug: string
  disposition?: Disposition | null
  locationSlug?: string | null
}

/** Cesta výpisu: /{transakce}/{kategorie}[/{dispozice}][/{lokalita}]. */
export function buildSearchPath(parts: SearchPathParts): string {
  const segments = [TRANSACTION_URL_SEGMENTS[parts.transaction], parts.categorySlug]
  if (parts.disposition) segments.push(DISPOSITION_URL_SLUGS[parts.disposition])
  if (parts.locationSlug) segments.push(parts.locationSlug)
  return `/${segments.join('/')}`
}
