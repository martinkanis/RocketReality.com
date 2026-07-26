'use client'

import { calculateMortgage, type MortgageResult } from '@rocket/core/mortgage'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MortgageCalculatorProps {
  price: number
  defaultDownPayment: number
  defaultRatePercent: number
  defaultYears: number
}

const currencyFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })

function computeMortgageResult(
  price: number,
  downPayment: string,
  ratePercent: string,
  years: string,
): MortgageResult | null {
  const downPaymentValue = Number(downPayment)
  const rateValue = Number(ratePercent)
  const yearsValue = Number(years)
  const isValid =
    price > 0 &&
    Number.isFinite(downPaymentValue) &&
    downPaymentValue >= 0 &&
    Number.isFinite(rateValue) &&
    rateValue >= 0 &&
    Number.isInteger(yearsValue) &&
    yearsValue > 0
  if (!isValid) return null
  return calculateMortgage({
    price,
    downPayment: downPaymentValue,
    annualRatePercent: rateValue,
    years: yearsValue,
  })
}

/** Hypoteční kalkulačka s živým přepočtem přes calculateMortgage z @rocket/core. */
export function MortgageCalculator({
  price,
  defaultDownPayment,
  defaultRatePercent,
  defaultYears,
}: MortgageCalculatorProps) {
  const [downPayment, setDownPayment] = useState(defaultDownPayment.toString())
  const [ratePercent, setRatePercent] = useState(defaultRatePercent.toString())
  const [years, setYears] = useState(defaultYears.toString())

  const result = computeMortgageResult(price, downPayment, ratePercent, years)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Cena nemovitosti: <strong>{currencyFormatter.format(price)} Kč</strong>
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mortgage-down-payment">Vlastní zdroje (Kč)</Label>
        <Input
          id="mortgage-down-payment"
          type="number"
          min={0}
          step={10000}
          value={downPayment}
          onChange={(event) => setDownPayment(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-rate">Úrok (% p. a.)</Label>
          <Input
            id="mortgage-rate"
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={ratePercent}
            onChange={(event) => setRatePercent(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-years">Doba (roky)</Label>
          <Input
            id="mortgage-years"
            type="number"
            min={1}
            max={50}
            step={1}
            value={years}
            onChange={(event) => setYears(event.target.value)}
          />
        </div>
      </div>
      {result ? (
        <div className="rounded-md bg-brand-50 p-4">
          <p className="text-sm text-muted-foreground">Měsíční splátka</p>
          <p className="text-xl font-semibold text-brand-500">
            {currencyFormatter.format(result.monthlyPayment)} Kč
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Výše úvěru {currencyFormatter.format(result.loanAmount)} Kč, celkem zaplatíte{' '}
            {currencyFormatter.format(result.totalPaid)} Kč.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Zadejte platné hodnoty pro výpočet.</p>
      )}
    </div>
  )
}
