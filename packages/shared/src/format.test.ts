import { describe, expect, it } from 'vitest'
import { formatArea, formatPrice } from './format'

const NBSP = ' '

describe('formatPrice', () => {
  it('formátuje celkovou cenu v Kč', () => {
    expect(formatPrice({ amount: 4_500_000, currency: 'CZK', unit: 'celkem', hidden: false })).toBe(
      `4${NBSP}500${NBSP}000 Kč`,
    )
  })

  it('přidá jednotku u nájmu', () => {
    expect(formatPrice({ amount: 18_500, currency: 'CZK', unit: 'za_mesic', hidden: false })).toBe(
      `18${NBSP}500 Kč za měsíc`,
    )
  })

  it('skrytá cena', () => {
    expect(formatPrice({ amount: 1, currency: 'CZK', unit: 'celkem', hidden: true })).toBe(
      'Info o ceně u inzerenta',
    )
  })

  it('cena dohodou', () => {
    expect(formatPrice({ amount: null, currency: 'CZK', unit: 'dohodou', hidden: false })).toBe(
      'Cena dohodou',
    )
  })
})

describe('formatArea', () => {
  it('formátuje plochu', () => {
    expect(formatArea(1250)).toBe(`1${NBSP}250 m²`)
  })
})
