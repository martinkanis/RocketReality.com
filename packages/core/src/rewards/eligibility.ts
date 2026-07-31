import { REWARD_LIMITS, type RewardBeneficiaryKind } from '@rocket/config'

/**
 * Pravidla nároku na odměnu z launch akce. Záměrně čistá logika bez databáze —
 * jde o peníze, takže musí být jednoduše čitelná a testovatelná.
 */

/** Komu odměna patří: kanceláři, pokud inzerát pod nějakou spadá, jinak inzerentovi. */
export interface RewardBeneficiary {
  kind: RewardBeneficiaryKind
  id: string
}

export interface RewardEligibilityInput {
  beneficiary: RewardBeneficiary
  /** Kolik odměn už příjemce dostal (schválené i čekající). */
  rewardedListings: number
  /** Kolik různých příjemců stejného druhu už do akce vstoupilo. */
  beneficiariesSoFar: number
  /** Zda je příjemce mezi nimi — pak už místo v akci obsadil dřív. */
  isExistingBeneficiary: boolean
}

export type RewardRejectionReason = 'listings_limit' | 'beneficiaries_limit'

export type RewardEligibility =
  { isEligible: true } | { isEligible: false; reason: RewardRejectionReason }

export function resolveBeneficiary(
  agencyId: string | null,
  ownerUserId: string,
): RewardBeneficiary {
  return agencyId ? { kind: 'agency', id: agencyId } : { kind: 'private', id: ownerUserId }
}

/** Odměna za jeden inzerát podle druhu příjemce. */
export function rewardAmountCzk(kind: RewardBeneficiaryKind): number {
  return REWARD_LIMITS[kind].amountCzkPerListing
}

/** Maximální částka, kterou může příjemce daného druhu z akce získat. */
export function maxRewardAmountCzk(kind: RewardBeneficiaryKind): number {
  const limits = REWARD_LIMITS[kind]
  return limits.maxRewardedListings * limits.amountCzkPerListing
}

export function checkRewardEligibility(input: RewardEligibilityInput): RewardEligibility {
  const limits = REWARD_LIMITS[input.beneficiary.kind]

  if (input.rewardedListings >= limits.maxRewardedListings) {
    return { isEligible: false, reason: 'listings_limit' }
  }
  // Místo v akci obsazuje příjemce až první odměnou; dál už se nepočítá znovu.
  if (!input.isExistingBeneficiary && input.beneficiariesSoFar >= limits.maxBeneficiaries) {
    return { isEligible: false, reason: 'beneficiaries_limit' }
  }
  return { isEligible: true }
}
