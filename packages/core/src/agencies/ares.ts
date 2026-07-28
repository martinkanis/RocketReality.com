const ARES_ENDPOINT = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty'
const ARES_TIMEOUT_MS = 8_000

export class AresLookupError extends Error {}

export interface AresCompany {
  ico: string
  name: string
  dic: string | null
  street: string | null
  city: string | null
  postalCode: string | null
  raw: unknown
}

interface AresSidlo {
  nazevUlice?: string
  cisloDomovni?: number
  cisloOrientacni?: number
  nazevObce?: string
  psc?: number
}

interface AresResponse {
  ico: string
  obchodniJmeno?: string
  dic?: string
  sidlo?: AresSidlo
}

function buildStreet(sidlo: AresSidlo | undefined): string | null {
  if (!sidlo?.nazevUlice || sidlo.cisloDomovni === undefined) return null
  const orientacni = sidlo.cisloOrientacni ? `/${sidlo.cisloOrientacni}` : ''
  return `${sidlo.nazevUlice} ${sidlo.cisloDomovni}${orientacni}`
}

/** Dohledá firmu v registru ARES podle IČO. Veřejné REST API, bez autentizace. */
export async function lookupAresCompany(ico: string): Promise<AresCompany> {
  if (!/^\d{8}$/.test(ico)) {
    throw new AresLookupError('IČO musí mít přesně 8 číslic')
  }

  let response: Response
  try {
    response = await fetch(`${ARES_ENDPOINT}/${ico}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(ARES_TIMEOUT_MS),
    })
  } catch (error) {
    throw new AresLookupError('Registr ARES je momentálně nedostupný, zkuste to prosím později', {
      cause: error,
    })
  }

  if (response.status === 404) {
    throw new AresLookupError(`Firma s IČO ${ico} v registru ARES neexistuje`)
  }
  if (!response.ok) {
    throw new AresLookupError(`Registr ARES vrátil chybu (${response.status})`)
  }

  const data = (await response.json()) as AresResponse
  if (!data.obchodniJmeno) {
    throw new AresLookupError('Odpověď ARES neobsahuje název firmy')
  }

  return {
    ico: data.ico,
    name: data.obchodniJmeno,
    dic: data.dic ?? null,
    street: buildStreet(data.sidlo),
    city: data.sidlo?.nazevObce ?? null,
    postalCode: data.sidlo?.psc ? String(data.sidlo.psc).padStart(5, '0') : null,
    raw: data,
  }
}
