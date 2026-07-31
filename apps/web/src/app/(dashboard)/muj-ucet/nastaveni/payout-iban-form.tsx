'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePayoutIban } from './actions'

interface PayoutIbanFormProps {
  initialIban: string
}

/** Účet pro výplatu odměny — ukládá se jednou, platí pro všechny inzeráty. */
export function PayoutIbanForm({ initialIban }: PayoutIbanFormProps) {
  const [iban, setIban] = useState(initialIban)
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaved(false)
    startTransition(async () => {
      const result = await updatePayoutIban(iban)
      if (result.ok) {
        setError(null)
        setIsSaved(true)
      } else {
        setError(result.error ?? 'Uložení se nepodařilo')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Číslo účtu ve formátu IBAN</span>
        <Input
          value={iban}
          onChange={(event) => setIban(event.target.value)}
          placeholder="CZ65 0800 0000 1920 0014 5399"
          className="max-w-md font-mono"
          inputMode="text"
          autoComplete="off"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? 'Ukládám…' : 'Uložit účet'}
        </Button>
        {isSaved ? <span className="text-sm text-success">Uloženo.</span> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
