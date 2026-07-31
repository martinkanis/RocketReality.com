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

/**
 * Podmínky launch akce. Soukromí inzerenti a realitní kanceláře mají vlastní
 * sazbu i limity — soukromník přinese pár inzerátů a potřebuje silnější
 * pobídku, kancelář jich přinese řádově víc, ale je jich méně.
 *
 * Limity vynucuje kód při zakládání nároku, ne až admin při výplatě: nárok
 * vzniká automaticky při zveřejnění, takže bez stropu by hromadný import
 * vyrobil odměny za statisíce.
 */
export const REWARD_LIMITS = {
  /** Soukromý inzerent: 5 × 100 Kč = 500 Kč, pro prvních 1 000 inzerentů. */
  private: { amountCzkPerListing: 100, maxRewardedListings: 5, maxBeneficiaries: 1_000 },
  /** Realitní kancelář: 100 × 50 Kč = 5 000 Kč, pro prvních 100 kanceláří. */
  agency: { amountCzkPerListing: 50, maxRewardedListings: 100, maxBeneficiaries: 100 },
} as const

export type RewardBeneficiaryKind = keyof typeof REWARD_LIMITS

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
