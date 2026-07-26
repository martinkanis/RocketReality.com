import { CATEGORY_MAIN_BY_SLUG } from '@rocket/shared'
import { searchQuerySchema, type SearchQuery } from '../search/query'

export interface WatchdogListingCandidate {
  categoryMainId: number
  transaction: string
  disposition: string | null
  kraj: string
  districtSlug: string
  municipalitySlug: string
  priceAmount: number | null
  areaUsable: number | null
  areaLand: number | null
}

/** Bezpečné načtení filtrů uloženého hledání (jsonb může být historicky nevalidní). */
export function parseSavedSearchFilters(filters: unknown): SearchQuery | null {
  const parsed = searchQuerySchema.safeParse(filters)
  return parsed.success ? parsed.data : null
}

/**
 * Vyhodnocení, zda nový inzerát odpovídá uloženému hledání — pro okamžité
 * notifikace hlídacího psa (bez SQL dotazu na každé hledání).
 */
export function matchesSavedSearch(listing: WatchdogListingCandidate, query: SearchQuery): boolean {
  const categoryMain = CATEGORY_MAIN_BY_SLUG.get(query.categoryMain)
  if (!categoryMain || listing.categoryMainId !== categoryMain.id) return false
  if (listing.transaction !== query.transaction) return false
  if (query.disposition?.length && !query.disposition.includes(listing.disposition as never)) {
    return false
  }
  if (query.kraj && listing.kraj !== query.kraj) return false
  if (query.district && listing.districtSlug !== query.district) return false
  if (query.municipality && listing.municipalitySlug !== query.municipality) return false

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    if (listing.priceAmount === null) return false
    if (query.priceMin !== undefined && listing.priceAmount < query.priceMin) return false
    if (query.priceMax !== undefined && listing.priceAmount > query.priceMax) return false
  }

  const area = listing.areaUsable ?? listing.areaLand
  if (query.areaMin !== undefined && (area === null || area < query.areaMin)) return false
  if (query.areaMax !== undefined && (area === null || area > query.areaMax)) return false

  return true
}
