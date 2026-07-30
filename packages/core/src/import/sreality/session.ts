import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Výpočet session_id importního rozhraní.
 *
 * Postup i použití MD5 předepisuje protokol exportního softwaru, nejde o volbu
 * portálu: session_id se skládá z 48znakové fixní části a variabilní části
 * md5(session_id + md5(heslo) + software_key) a mění se s každým autorizovaným
 * požadavkem. Aby slabost MD5 nic neznamenala, heslo k importu se negeneruje
 * uživatelem, ale náhodně (viz createImportPassword) a nikdy se nesdílí
 * s heslem k účtu.
 */

const FIXED_PART_LENGTH = 48
const VARIABLE_PART_BYTES = 16
const IMPORT_PASSWORD_BYTES = 16

/** Neaktivní relace vyprší po 15 minutách, jak předepisuje protokol. */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000

export interface ImportSessionCredentials {
  /** md5(heslo) — do výpočtu vstupuje hash, ne heslo samotné. */
  passwordMd5: string
  /** Klíč identifikující exportní software realitní kanceláře. */
  softwareKey: string
}

function md5(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex')
}

/** Heslo k importu — náhodné, uživatel si ho nevolí. */
export function createImportPassword(): string {
  return randomBytes(IMPORT_PASSWORD_BYTES).toString('hex')
}

export function hashImportPassword(password: string): string {
  return md5(password)
}

/** Počáteční session_id vydané metodou getHash. */
export function createSessionId(): string {
  return (
    randomBytes(FIXED_PART_LENGTH / 2).toString('hex') +
    randomBytes(VARIABLE_PART_BYTES).toString('hex')
  )
}

export function getFixedPart(sessionId: string): string {
  return sessionId.slice(0, FIXED_PART_LENGTH)
}

/**
 * Hodnota session_id, kterou musí klient poslat v následujícím požadavku.
 * Server ji počítá stejným postupem jako klient a porovnává.
 */
export function computeNextSessionId(
  currentSessionId: string,
  credentials: ImportSessionCredentials,
): string {
  const variablePart = md5(currentSessionId + credentials.passwordMd5 + credentials.softwareKey)
  return getFixedPart(currentSessionId) + variablePart
}

/** Porovnání v konstantním čase — session_id je autentizační tajemství. */
export function matchesExpectedSessionId(
  providedSessionId: string,
  currentSessionId: string,
  credentials: ImportSessionCredentials,
): boolean {
  const expected = Buffer.from(computeNextSessionId(currentSessionId, credentials), 'utf8')
  const provided = Buffer.from(providedSessionId, 'utf8')
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
