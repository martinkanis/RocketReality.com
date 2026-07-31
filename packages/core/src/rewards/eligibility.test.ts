import { describe, expect, it } from 'vitest'
import {
  checkRewardEligibility,
  maxRewardAmountCzk,
  resolveBeneficiary,
  rewardAmountCzk,
  type RewardEligibilityInput,
} from './eligibility'

const agency = { kind: 'agency', id: 'kancelar-1' } as const
const privatePerson = { kind: 'private', id: 'uzivatel-1' } as const

function input(overrides: Partial<RewardEligibilityInput> = {}): RewardEligibilityInput {
  return {
    beneficiary: privatePerson,
    rewardedListings: 0,
    beneficiariesSoFar: 0,
    isExistingBeneficiary: false,
    ...overrides,
  }
}

describe('resolveBeneficiary', () => {
  it('inzerát pod kanceláří odměňuje kancelář', () => {
    expect(resolveBeneficiary('kancelar-1', 'uzivatel-1')).toEqual(agency)
  })

  it('inzerát bez kanceláře odměňuje inzerenta', () => {
    expect(resolveBeneficiary(null, 'uzivatel-1')).toEqual(privatePerson)
  })
})

describe('checkRewardEligibility — soukromý inzerent', () => {
  it('první inzerát nárok má', () => {
    expect(checkRewardEligibility(input())).toEqual({ isEligible: true })
  })

  it('pátý inzerát ještě projde, šestý už ne', () => {
    expect(checkRewardEligibility(input({ rewardedListings: 4 })).isEligible).toBe(true)
    expect(checkRewardEligibility(input({ rewardedListings: 5 }))).toEqual({
      isEligible: false,
      reason: 'listings_limit',
    })
  })

  it('po vyčerpání tisícovky inzerentů nový nárok nemá', () => {
    expect(checkRewardEligibility(input({ beneficiariesSoFar: 1_000 }))).toEqual({
      isEligible: false,
      reason: 'beneficiaries_limit',
    })
  })

  it('kdo už místo v akci obsadil, pokračuje i po vyčerpání tisícovky', () => {
    const eligibility = checkRewardEligibility(
      input({ beneficiariesSoFar: 1_000, isExistingBeneficiary: true, rewardedListings: 3 }),
    )

    expect(eligibility).toEqual({ isEligible: true })
  })
})

describe('checkRewardEligibility — realitní kancelář', () => {
  it('kancelář má strop na sto inzerátů, ne na pět jako soukromník', () => {
    expect(
      checkRewardEligibility(input({ beneficiary: agency, rewardedListings: 50 })).isEligible,
    ).toBe(true)
    expect(
      checkRewardEligibility(input({ beneficiary: agency, rewardedListings: 99 })).isEligible,
    ).toBe(true)
    expect(checkRewardEligibility(input({ beneficiary: agency, rewardedListings: 100 }))).toEqual({
      isEligible: false,
      reason: 'listings_limit',
    })
  })

  it('kanceláře se počítají zvlášť od soukromých inzerentů', () => {
    const eligibility = checkRewardEligibility(
      input({ beneficiary: agency, beneficiariesSoFar: 99 }),
    )

    expect(eligibility).toEqual({ isEligible: true })
  })

  it('po stovce kanceláří další nárok nemá', () => {
    expect(checkRewardEligibility(input({ beneficiary: agency, beneficiariesSoFar: 100 }))).toEqual(
      {
        isEligible: false,
        reason: 'beneficiaries_limit',
      },
    )
  })
})

describe('sazby a stropy odměny', () => {
  it('soukromník bere 100 Kč za inzerát do 500 Kč', () => {
    expect(rewardAmountCzk('private')).toBe(100)
    expect(maxRewardAmountCzk('private')).toBe(500)
  })

  it('kancelář bere 50 Kč za inzerát do 5 000 Kč', () => {
    expect(rewardAmountCzk('agency')).toBe(50)
    expect(maxRewardAmountCzk('agency')).toBe(5_000)
  })
})
