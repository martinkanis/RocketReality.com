import { describe, expect, it } from 'vitest'
import { searchQuerySchema } from '../search/query'
import {
  matchesSavedSearch,
  parseSavedSearchFilters,
  type WatchdogListingCandidate,
} from './matching'

const brnoApartment: WatchdogListingCandidate = {
  categoryMainId: 1,
  transaction: 'prodej',
  disposition: '2+kk',
  kraj: 'jihomoravsky',
  districtSlug: 'brno-mesto',
  municipalitySlug: 'brno',
  priceAmount: 5_500_000,
  areaUsable: 55,
  areaLand: null,
}

function query(overrides: Record<string, unknown> = {}) {
  return searchQuerySchema.parse({ transaction: 'prodej', categoryMain: 'byty', ...overrides })
}

describe('matchesSavedSearch', () => {
  it('shoda kategorie, transakce a obce', () => {
    expect(matchesSavedSearch(brnoApartment, query({ municipality: 'brno' }))).toBe(true)
  })

  it('neshoda dispozice', () => {
    expect(matchesSavedSearch(brnoApartment, query({ disposition: ['3+kk'] }))).toBe(false)
  })

  it('cenový strop', () => {
    expect(matchesSavedSearch(brnoApartment, query({ priceMax: 5_000_000 }))).toBe(false)
    expect(matchesSavedSearch(brnoApartment, query({ priceMax: 6_000_000 }))).toBe(true)
  })

  it('rozsah plochy', () => {
    expect(matchesSavedSearch(brnoApartment, query({ areaMin: 60 }))).toBe(false)
    expect(matchesSavedSearch(brnoApartment, query({ areaMin: 40, areaMax: 60 }))).toBe(true)
  })

  it('jiná kategorie nikdy nematchne', () => {
    expect(matchesSavedSearch(brnoApartment, query({ categoryMain: 'domy' }))).toBe(false)
  })
})

describe('parseSavedSearchFilters', () => {
  it('vrátí null pro nevalidní jsonb', () => {
    expect(parseSavedSearchFilters({ nesmysl: true })).toBeNull()
  })

  it('parsuje validní filtry', () => {
    expect(parseSavedSearchFilters({ transaction: 'prodej', categoryMain: 'byty' })).not.toBeNull()
  })
})
