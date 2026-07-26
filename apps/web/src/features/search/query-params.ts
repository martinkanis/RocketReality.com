import {
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_TYPES,
  OWNERSHIP_TYPES,
} from '@rocket/shared'
import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from 'nuqs/server'

export const SORT_OPTIONS = ['nejnovejsi', 'nejlevnejsi', 'nejdrazsi'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

/**
 * Filtry výpisu v URL query — jediná definice parserů sdílená klientem
 * (useQueryStates) i serverem (loader v page.tsx). Nevalidní hodnoty parser
 * odmítne (null), takže se do SearchQuery nikdy nedostanou.
 */
export const searchFilterParsers = {
  dispozice: parseAsArrayOf(parseAsStringLiteral(DISPOSITIONS)),
  cenaOd: parseAsInteger,
  cenaDo: parseAsInteger,
  plochaOd: parseAsInteger,
  plochaDo: parseAsInteger,
  vlastnictvi: parseAsArrayOf(parseAsStringLiteral(OWNERSHIP_TYPES)),
  stavba: parseAsArrayOf(parseAsStringLiteral(BUILDING_TYPES)),
  stav: parseAsArrayOf(parseAsStringLiteral(BUILDING_CONDITIONS)),
  zarizeni: parseAsArrayOf(parseAsStringLiteral(FURNISHING_TYPES)),
  energieMax: parseAsStringLiteral(ENERGY_LABELS),
  balkon: parseAsBoolean,
  terasa: parseAsBoolean,
  sklep: parseAsBoolean,
  vytah: parseAsBoolean,
  garaz: parseAsBoolean,
  parkovani: parseAsBoolean,
  hledat: parseAsString,
  razeni: parseAsStringLiteral(SORT_OPTIONS).withDefault('nejnovejsi'),
  strana: parseAsInteger.withDefault(1),
}

/** Mapování TS klíčů na hezké URL parametry s pomlčkou. */
export const searchFilterUrlKeys: Partial<Record<keyof typeof searchFilterParsers, string>> = {
  cenaOd: 'cena-od',
  cenaDo: 'cena-do',
  plochaOd: 'plocha-od',
  plochaDo: 'plocha-do',
  energieMax: 'energie-max',
}

export type SearchFilterValues = inferParserType<typeof searchFilterParsers>

export const loadSearchFilters = createLoader(searchFilterParsers, {
  urlKeys: searchFilterUrlKeys,
})

export const serializeSearchFilters = createSerializer(searchFilterParsers, {
  urlKeys: searchFilterUrlKeys,
})
