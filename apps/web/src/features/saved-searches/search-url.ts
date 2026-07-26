import type { SearchQuery } from '@rocket/core'
import { DISPOSITION_URL_SLUGS } from '@/features/search/url'

const DEFAULT_SORT = 'nejnovejsi'

/**
 * URL výpisu odpovídající uloženým filtrům: /prodej/byty/2-kk/brno?cena-do=6000000.
 * Dispozice je segmentem jen při výběru právě jedné, lokalita se skládá z nejužšího slugu.
 */
export function buildSearchUrl(query: SearchQuery): string {
  const segments = [query.transaction, query.categoryMain]

  const [singleDisposition] = query.disposition ?? []
  if (query.disposition?.length === 1 && singleDisposition) {
    segments.push(DISPOSITION_URL_SLUGS[singleDisposition])
  }

  const locality = query.municipality ?? query.district ?? query.kraj
  if (locality) segments.push(locality)

  const params = new URLSearchParams()
  if (query.priceMin !== undefined) params.set('cena-od', String(query.priceMin))
  if (query.priceMax !== undefined) params.set('cena-do', String(query.priceMax))
  if (query.areaMin !== undefined) params.set('plocha-od', String(query.areaMin))
  if (query.areaMax !== undefined) params.set('plocha-do', String(query.areaMax))
  if (query.sort !== DEFAULT_SORT) params.set('razeni', query.sort)

  const queryString = params.toString()
  return `/${segments.join('/')}${queryString ? `?${queryString}` : ''}`
}
