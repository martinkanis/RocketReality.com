import { describe, expect, it } from 'vitest'
import { calculateMortgage } from './calculate'

describe('calculateMortgage', () => {
  it('počítá anuitní splátku (4 mil. úvěr, 4,89 %, 30 let)', () => {
    const result = calculateMortgage({
      price: 5_000_000,
      downPayment: 1_000_000,
      annualRatePercent: 4.89,
      years: 30,
    })
    expect(result.loanAmount).toBe(4_000_000)
    expect(result.monthlyPayment).toBeGreaterThan(21_000)
    expect(result.monthlyPayment).toBeLessThan(21_500)
    expect(result.totalInterest).toBeGreaterThan(3_000_000)
  })

  it('nulová sazba = lineární splátka', () => {
    const result = calculateMortgage({
      price: 1_200_000,
      downPayment: 0,
      annualRatePercent: 0,
      years: 10,
    })
    expect(result.monthlyPayment).toBe(10_000)
    expect(result.totalInterest).toBe(0)
  })

  it('vlastní zdroje pokrývající cenu = žádný úvěr', () => {
    const result = calculateMortgage({
      price: 1_000_000,
      downPayment: 1_500_000,
      annualRatePercent: 5,
      years: 20,
    })
    expect(result.loanAmount).toBe(0)
    expect(result.monthlyPayment).toBe(0)
  })

  it('odmítne nevalidní vstup', () => {
    expect(() =>
      calculateMortgage({ price: 0, downPayment: 0, annualRatePercent: 5, years: 30 }),
    ).toThrow()
  })
})
