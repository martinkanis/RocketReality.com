import { AddressSearchError, CuzkAddressSearch } from '@rocket/core'
import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger'
import { getSessionUser } from '@/lib/session'

const logger = createLogger('api.adresy')

const addressSearch = new CuzkAddressSearch()

const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

interface CacheEntry {
  value: unknown
  expiresAt: number
}

/**
 * Odpovědi registru se opakují (uživatel dopisuje adresu po písmenech),
 * proto je krátce držíme v paměti — šetří to registr i odezvu.
 */
const cache = new Map<string, CacheEntry>()

function readCache(key: string): CacheEntry | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry
}

function writeCache(key: string, value: unknown): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Našeptávač adres nad RÚIAN. S parametrem `q` vrací návrhy, s `key` a `label`
 * dohledá souřadnice vybrané adresy. Běží na serveru, aby se z portálu
 * nestala veřejná geokódovací proxy — proto vyžaduje přihlášení.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Vyžaduje přihlášení' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const key = params.get('key')
  const label = params.get('label')?.trim() ?? ''
  const query = params.get('q')?.trim() ?? ''

  const cacheKey = key ? `resolve:${key}` : `suggest:${query.toLowerCase()}`
  const cached = readCache(cacheKey)
  if (cached) return NextResponse.json(cached.value)

  try {
    const payload = key
      ? { address: await addressSearch.resolve({ key, label }) }
      : { suggestions: await addressSearch.suggest(query) }
    writeCache(cacheKey, payload)
    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AddressSearchError) {
      logger.warn({ err: error }, 'Registr adres neodpověděl')
      // Výpadek registru nesmí zablokovat vkládání — adresu lze vyplnit ručně.
      return NextResponse.json({ suggestions: [], address: null, unavailable: true })
    }
    logger.error({ err: error }, 'Našeptávač adres selhal')
    return NextResponse.json({ error: 'Našeptávač adres selhal' }, { status: 500 })
  }
}
