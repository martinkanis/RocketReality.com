/**
 * SPAYD (Short Payment Descriptor) — český standard QR platby.
 * Formát: SPD*1.0*ACC:CZ2806000000000168540115+KOMBCZPP*AM:450.00*CC:CZK*MSG:...
 */

export interface SpaydPayment {
  iban: string
  bic: string | null
  amount: number | null
  currency: string
  message: string | null
  variableSymbol: string | null
  raw: string
}

const SPAYD_PREFIX = 'SPD*'
const IBAN_PATTERN = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/

/** Kontrola IBAN podle ISO 13616 (přesun prefixu na konec + mod 97 === 1). */
export function isValidIban(input: string): boolean {
  const iban = input.replace(/\s+/g, '').toUpperCase()
  if (!IBAN_PATTERN.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55))
  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** Parsuje SPAYD řetězec z QR kódu. Vrací null, pokud nejde o validní platební QR. */
export function parseSpayd(text: string): SpaydPayment | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith(SPAYD_PREFIX)) return null

  const fields = new Map<string, string>()
  for (const part of trimmed.split('*').slice(2)) {
    const separatorIndex = part.indexOf(':')
    if (separatorIndex === -1) continue
    const key = part.slice(0, separatorIndex).toUpperCase()
    const value = part.slice(separatorIndex + 1)
    fields.set(key, decodeURIComponent(value))
  }

  const account = fields.get('ACC')
  if (!account) return null
  const [ibanPart, bicPart] = account.split('+')
  const iban = (ibanPart ?? '').replace(/\s+/g, '').toUpperCase()
  if (!isValidIban(iban)) return null

  const amountRaw = fields.get('AM')
  const amount = amountRaw !== undefined ? Number.parseFloat(amountRaw) : null

  return {
    iban,
    bic: bicPart ?? null,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: fields.get('CC') ?? 'CZK',
    message: fields.get('MSG') ?? null,
    variableSymbol: fields.get('X-VS') ?? null,
    raw: trimmed,
  }
}

export interface BuildSpaydInput {
  iban: string
  amountCzk: number
  message?: string
}

/** Sestaví SPAYD pro platební QR (výplata odměny adminem přes bankovní aplikaci). */
export function buildSpayd({ iban, amountCzk, message }: BuildSpaydInput): string {
  if (!isValidIban(iban)) {
    throw new Error(`Nevalidní IBAN: ${iban}`)
  }
  if (!(amountCzk > 0)) {
    throw new Error(`Nevalidní částka: ${amountCzk}`)
  }
  const parts = [`SPD*1.0*ACC:${iban}`, `AM:${amountCzk.toFixed(2)}`, 'CC:CZK']
  if (message) {
    parts.push(`MSG:${message.replace(/\*/g, ' ').slice(0, 60)}`)
  }
  return parts.join('*')
}
