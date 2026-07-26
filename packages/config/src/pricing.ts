/**
 * Výchozí ceník produktů. V1 je vše zdarma (0 Kč) — monetizace se zapíná
 * změnou cen v tabulce products + PAYMENTS_PROVIDER=stripe, bez zásahu do kódu.
 * Cílové ceny po zapnutí: 10–50 Kč (min. 10× levnější než sreality).
 */

export interface ProductDefinition {
  code: string
  name: string
  priceCzk: number
  durationDays: number
}

export const PRODUCT_CODES = {
  publikace30d: 'publikace_30d',
  prodlouzeni30d: 'prodlouzeni_30d',
  top7d: 'top_7d',
} as const

export const DEFAULT_PRODUCTS: readonly ProductDefinition[] = [
  {
    code: PRODUCT_CODES.publikace30d,
    name: 'Publikace inzerátu na 30 dní',
    priceCzk: 0,
    durationDays: 30,
  },
  {
    code: PRODUCT_CODES.prodlouzeni30d,
    name: 'Prodloužení inzerátu o 30 dní',
    priceCzk: 0,
    durationDays: 30,
  },
  {
    code: PRODUCT_CODES.top7d,
    name: 'Topování inzerátu na 7 dní',
    priceCzk: 0,
    durationDays: 7,
  },
] as const
