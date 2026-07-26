'use client'

import { calculateMortgage } from '@rocket/core/mortgage'
import { useState, type ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const DEFAULT_PRICE = 5_000_000
const DEFAULT_DOWN_PAYMENT_PERCENT = 20
const DEFAULT_RATE_PERCENT = 4.9
const DEFAULT_YEARS = 25
const MIN_YEARS = 5
const MAX_YEARS = 35
const MAX_DOWN_PAYMENT_PERCENT = 90

const currencyFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })

function formatCzk(amount: number): string {
  return `${currencyFormatter.format(amount)} Kč`
}

function parseNumberInput(event: ChangeEvent<HTMLInputElement>): number {
  const value = Number(event.target.value)
  return Number.isFinite(value) ? value : 0
}

export function MortgageCalculator() {
  const [price, setPrice] = useState(DEFAULT_PRICE)
  const [downPayment, setDownPayment] = useState(
    (DEFAULT_PRICE * DEFAULT_DOWN_PAYMENT_PERCENT) / 100,
  )
  const [ratePercent, setRatePercent] = useState(DEFAULT_RATE_PERCENT)
  const [years, setYears] = useState(DEFAULT_YEARS)

  const clampedDownPayment = Math.min(Math.max(downPayment, 0), Math.max(price, 0))
  const downPaymentPercent = price > 0 ? Math.round((clampedDownPayment / price) * 100) : 0
  const canCalculate = price > 0 && ratePercent >= 0 && years > 0
  const result = canCalculate
    ? calculateMortgage({
        price,
        downPayment: clampedDownPayment,
        annualRatePercent: ratePercent,
        years,
      })
    : null

  function handleDownPaymentPercentChange(event: ChangeEvent<HTMLInputElement>) {
    const percent = parseNumberInput(event)
    setDownPayment(Math.round((price * percent) / 100))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spočítejte si měsíční splátku</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-price">Cena nemovitosti (Kč)</Label>
          <Input
            id="mortgage-price"
            type="number"
            min={0}
            step={100_000}
            value={price}
            onChange={(event) => setPrice(parseNumberInput(event))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-down-payment">Vlastní zdroje ({downPaymentPercent} %)</Label>
          <div className="flex items-center gap-4">
            <input
              id="mortgage-down-payment-percent"
              type="range"
              min={0}
              max={MAX_DOWN_PAYMENT_PERCENT}
              step={1}
              value={Math.min(downPaymentPercent, MAX_DOWN_PAYMENT_PERCENT)}
              onChange={handleDownPaymentPercentChange}
              className="flex-1 accent-primary"
              aria-label="Vlastní zdroje v procentech"
            />
            <Input
              id="mortgage-down-payment"
              type="number"
              min={0}
              step={50_000}
              value={clampedDownPayment}
              onChange={(event) => setDownPayment(parseNumberInput(event))}
              className="w-40"
              aria-label="Vlastní zdroje v Kč"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-rate">Úroková sazba (% ročně)</Label>
          <Input
            id="mortgage-rate"
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={ratePercent}
            onChange={(event) => setRatePercent(parseNumberInput(event))}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mortgage-years">Doba splácení: {years} let</Label>
          <input
            id="mortgage-years"
            type="range"
            min={MIN_YEARS}
            max={MAX_YEARS}
            step={1}
            value={years}
            onChange={(event) => setYears(parseNumberInput(event))}
            className="accent-primary"
          />
        </div>

        <Separator />

        {result ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Měsíční splátka</p>
              <p className="text-4xl font-bold text-primary">{formatCzk(result.monthlyPayment)}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Výše úvěru</dt>
                <dd className="font-semibold text-heading">{formatCzk(result.loanAmount)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Celkem zaplaceno</dt>
                <dd className="font-semibold text-heading">{formatCzk(result.totalPaid)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Z toho úroky</dt>
                <dd className="font-semibold text-heading">{formatCzk(result.totalInterest)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Zadejte cenu nemovitosti a dobu splácení.</p>
        )}

        <p className="text-xs text-muted-foreground">
          Orientační výpočet — skutečná splátka závisí na nabídce konkrétní banky a vaší bonitě.
        </p>
      </CardContent>
    </Card>
  )
}
