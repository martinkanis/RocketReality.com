export interface MortgageInput {
  /** Cena nemovitosti v Kč. */
  price: number
  /** Vlastní zdroje v Kč. */
  downPayment: number
  /** Roční úroková sazba v procentech (např. 4.89). */
  annualRatePercent: number
  /** Doba splácení v letech. */
  years: number
}

export interface MortgageResult {
  loanAmount: number
  monthlyPayment: number
  totalPaid: number
  totalInterest: number
}

/** Anuitní splátka hypotéky. Vstupy validuje volající (formulář), zde jen invarianty. */
export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { price, downPayment, annualRatePercent, years } = input
  if (price <= 0 || years <= 0 || annualRatePercent < 0 || downPayment < 0) {
    throw new Error('Nevalidní vstup hypoteční kalkulačky')
  }
  const loanAmount = Math.max(0, price - downPayment)
  if (loanAmount === 0) {
    return { loanAmount: 0, monthlyPayment: 0, totalPaid: 0, totalInterest: 0 }
  }
  const months = years * 12
  const monthlyRate = annualRatePercent / 100 / 12
  const monthlyPayment =
    monthlyRate === 0
      ? loanAmount / months
      : (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
  const totalPaid = monthlyPayment * months
  return {
    loanAmount,
    monthlyPayment: Math.round(monthlyPayment),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalPaid - loanAmount),
  }
}
