import { searchQuerySchema, type SearchQuery, type SearchQueryInput } from '@rocket/core'
import type { Disposition, TransactionType } from '@rocket/shared'

import type { SearchFilterValues } from './query-params'

export const SEARCH_PAGE_SIZE = 20
const FULLTEXT_MAX_LENGTH = 200

interface BuildSearchQueryInput {
  transaction: TransactionType
  categorySlug: string
  pathDisposition: Disposition | null
  municipalitySlug: string | null
  districtSlug: string | null
  filters: SearchFilterValues
}

function nonNegativeOrUndefined(value: number | null): number | undefined {
  return value !== null && value >= 0 ? value : undefined
}

function nonEmptyOrUndefined<T>(values: T[] | null): T[] | undefined {
  return values && values.length > 0 ? values : undefined
}

function trimmedFulltext(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, FULLTEXT_MAX_LENGTH) : undefined
}

/** Poskládá SearchQuery z URL segmentů a query filtrů. Dispozice v query má přednost před segmentem. */
export function buildSearchQuery(input: BuildSearchQueryInput): SearchQuery {
  const { filters } = input
  const disposition = filters.dispozice?.length
    ? filters.dispozice
    : input.pathDisposition
      ? [input.pathDisposition]
      : undefined

  return searchQuerySchema.parse({
    transaction: input.transaction,
    categoryMain: input.categorySlug,
    disposition,
    municipality: input.municipalitySlug ?? undefined,
    district: input.districtSlug ?? undefined,
    priceMin: nonNegativeOrUndefined(filters.cenaOd),
    priceMax: nonNegativeOrUndefined(filters.cenaDo),
    areaMin: nonNegativeOrUndefined(filters.plochaOd),
    areaMax: nonNegativeOrUndefined(filters.plochaDo),
    ownership: nonEmptyOrUndefined(filters.vlastnictvi),
    buildingType: nonEmptyOrUndefined(filters.stavba),
    buildingCondition: nonEmptyOrUndefined(filters.stav),
    furnishing: nonEmptyOrUndefined(filters.zarizeni),
    energyLabelMax: filters.energieMax ?? undefined,
    hasBalcony: filters.balkon ? true : undefined,
    hasTerrace: filters.terasa ? true : undefined,
    hasCellar: filters.sklep ? true : undefined,
    hasElevator: filters.vytah ? true : undefined,
    hasGarage: filters.garaz ? true : undefined,
    hasParking: filters.parkovani ? true : undefined,
    fulltext: trimmedFulltext(filters.hledat),
    sort: filters.razeni,
    page: Math.max(1, filters.strana),
    pageSize: SEARCH_PAGE_SIZE,
  } satisfies SearchQueryInput)
}
