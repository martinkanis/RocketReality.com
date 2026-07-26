import { PRICE_UNIT_LABELS, type Currency, type PriceUnit } from './enums'

const czkFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })

export interface PriceParts {
  amount: number | null
  currency: Currency
  unit: PriceUnit
  hidden: boolean
}

/** Formátuje cenu inzerátu: „4 500 000 Kč", „18 500 Kč za měsíc", „Info o ceně v RK". */
export function formatPrice({ amount, currency, unit, hidden }: PriceParts): string {
  if (unit === 'dohodou') return 'Cena dohodou'
  if (hidden || amount === null) return 'Info o ceně u inzerenta'
  const symbol = currency === 'CZK' ? 'Kč' : '€'
  const base = `${czkFormatter.format(amount)} ${symbol}`
  return unit === 'celkem' ? base : `${base} ${PRICE_UNIT_LABELS[unit]}`
}

/** Formátuje plochu v m²: „82 m²". */
export function formatArea(area: number): string {
  return `${czkFormatter.format(area)} m²`
}
