/**
 * Našeptávač adres nad státním registrem RÚIAN.
 *
 * Data se nestahují do vlastní databáze — ČÚZK poskytuje veřejné geokódovací
 * rozhraní s denní aktualizací zdarma a bez klíče, takže se dotazujeme přímo.
 * Port umožní poskytovatele vyměnit, kdyby přestal stačit.
 */

export interface AddressSuggestion {
  /** Adresa v podobě, jak ji vrací registr: „Botanická 934/68, Veveří, 60200 Brno". */
  label: string
  /** Neprůhledný klíč registru pro dohledání souřadnic konkrétní adresy. */
  key: string
}

export interface ResolvedAddress {
  label: string
  /** Ulice s číslem, připravená k uložení do inzerátu. */
  street: string
  municipality: string
  postalCode: string | null
  lat: number
  lng: number
}

export interface AddressSearchPort {
  suggest(query: string): Promise<AddressSuggestion[]>
  resolve(suggestion: { key: string; label: string }): Promise<ResolvedAddress | null>
}

const CUZK_GEOCODE_URL =
  'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/exts/GeocodeSOE'

const REQUEST_TIMEOUT_MS = 4_000
const MAX_SUGGESTIONS = 8
const MIN_QUERY_LENGTH = 3

/** Adresní místo je jediný typ, který nese číslo popisné a přesný bod. */
const ADDRESS_POINT_TYPE = 'AdresniMisto'

export class AddressSearchError extends Error {}

interface CuzkSuggestion {
  text?: string
  magicKey?: string
  type?: string
}

interface CuzkCandidate {
  address?: string
  location?: { x?: number; y?: number }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new AddressSearchError(`Registr adres odpověděl HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/**
 * Rozloží adresu z registru na části. Tvar je ustálený:
 * „Ulice 934/68, Část obce, 60200 Obec" — část obce nemusí být uvedena.
 */
export function parseAddressLabel(label: string): Omit<ResolvedAddress, 'lat' | 'lng' | 'label'> {
  const parts = label.split(',').map((part) => part.trim())
  const street = parts[0] ?? ''
  const lastPart = parts[parts.length - 1] ?? ''
  const withPostalCode = /^(\d{3}\s?\d{2})\s+(.+)$/.exec(lastPart)

  return {
    street,
    municipality: withPostalCode ? withPostalCode[2]!.trim() : lastPart,
    postalCode: withPostalCode ? withPostalCode[1]!.replace(/\s/g, '') : null,
  }
}

/** Našeptávač a geokodér nad veřejným rozhraním ČÚZK. */
export class CuzkAddressSearch implements AddressSearchPort {
  async suggest(query: string): Promise<AddressSuggestion[]> {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) return []

    const url = `${CUZK_GEOCODE_URL}/suggest?text=${encodeURIComponent(trimmed)}&f=json`
    const data = await fetchJson<{ suggestions?: CuzkSuggestion[] }>(url)

    return (data.suggestions ?? [])
      .filter((item) => item.type === ADDRESS_POINT_TYPE && item.text && item.magicKey)
      .slice(0, MAX_SUGGESTIONS)
      .map((item) => ({ label: item.text!, key: item.magicKey! }))
  }

  async resolve(suggestion: { key: string; label: string }): Promise<ResolvedAddress | null> {
    const url =
      `${CUZK_GEOCODE_URL}/findAddressCandidates` +
      `?SingleLine=${encodeURIComponent(suggestion.label)}` +
      `&magicKey=${encodeURIComponent(suggestion.key)}` +
      '&outSR=4326&maxLocations=1&f=json'
    const data = await fetchJson<{ candidates?: CuzkCandidate[] }>(url)

    const candidate = data.candidates?.[0]
    const lng = candidate?.location?.x
    const lat = candidate?.location?.y
    if (!candidate?.address || typeof lat !== 'number' || typeof lng !== 'number') return null

    return { label: candidate.address, ...parseAddressLabel(candidate.address), lat, lng }
  }
}
