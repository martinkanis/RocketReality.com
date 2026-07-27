import type { SearchQuery } from '@rocket/core'
import { DISPOSITION_LABELS, KRAJ_LABELS, TRANSACTION_LABELS, formatArea } from '@rocket/shared'

const numberFormatter = new Intl.NumberFormat('cs-CZ')

/** Názvy hlavních kategorií ve 2. pádě — pro popis typu „Prodej bytů". */
const CATEGORY_GENITIVE_BY_SLUG: Record<string, string> = {
  byty: 'bytů',
  domy: 'domů',
  pozemky: 'pozemků',
  komercni: 'komerčních prostor',
  ostatni: 'ostatních nemovitostí',
}

/** Z lokalitního slugu udělá čitelný text: „brno-stred" → „Brno stred". */
function humanizeSlug(slug: string): string {
  const words = slug.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function describeLocation(query: SearchQuery): string | null {
  if (query.municipality) return humanizeSlug(query.municipality)
  if (query.district) return humanizeSlug(query.district)
  if (query.kraj) {
    const krajLabel = (KRAJ_LABELS as Record<string, string>)[query.kraj]
    return krajLabel ?? humanizeSlug(query.kraj)
  }
  return null
}

function describePriceRange(query: SearchQuery): string | null {
  const { priceMin, priceMax } = query
  if (priceMin !== undefined && priceMax !== undefined) {
    return `${numberFormatter.format(priceMin)}–${numberFormatter.format(priceMax)} Kč`
  }
  if (priceMax !== undefined) return `do ${numberFormatter.format(priceMax)} Kč`
  if (priceMin !== undefined) return `od ${numberFormatter.format(priceMin)} Kč`
  return null
}

function describeAreaRange(query: SearchQuery): string | null {
  const { areaMin, areaMax } = query
  if (areaMin !== undefined && areaMax !== undefined) {
    return `plocha ${numberFormatter.format(areaMin)}–${formatArea(areaMax)}`
  }
  if (areaMax !== undefined) return `plocha do ${formatArea(areaMax)}`
  if (areaMin !== undefined) return `plocha od ${formatArea(areaMin)}`
  return null
}

/** Lidsky čitelný popis filtrů, např. „Prodej bytů 2+kk, Brno, do 6 000 000 Kč". */
export function describeSearchFilters(query: SearchQuery): string {
  const categoryName = CATEGORY_GENITIVE_BY_SLUG[query.categoryMain] ?? query.categoryMain
  let subject = `${TRANSACTION_LABELS[query.transaction]} ${categoryName}`
  if (query.disposition && query.disposition.length > 0) {
    subject += ` ${query.disposition.map((item) => DISPOSITION_LABELS[item]).join(', ')}`
  }

  const parts = [subject]
  const location = describeLocation(query)
  if (location) parts.push(location)
  const price = describePriceRange(query)
  if (price) parts.push(price)
  const area = describeAreaRange(query)
  if (area) parts.push(area)
  return parts.join(', ')
}
