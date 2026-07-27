'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { markRewardPaidAction } from './actions'

interface RewardPayoutCardProps {
  id: string
  iban: string
  amountCzk: number
  listingTitle: string
  qrDataUrl: string
}

export function RewardPayoutCard(props: RewardPayoutCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function markPaid() {
    setError(null)
    startTransition(async () => {
      try {
        await markRewardPaidAction(props.id)
      } catch {
        setError('Akce se nepodařila — obnovte stránku.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{props.listingTitle}</CardTitle>
        <p className="font-mono text-sm text-muted-foreground">{props.iban}</p>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Image
          src={props.qrDataUrl}
          alt={`Platební QR kód na ${props.amountCzk} Kč`}
          width={144}
          height={144}
          unoptimized
          className="rounded-sm border border-border"
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Naskenujte QR ve své bankovní aplikaci a odešlete{' '}
            <strong className="text-heading">{props.amountCzk} Kč</strong>. Poté potvrďte níže.
          </p>
          <Button onClick={markPaid} disabled={isPending}>
            {isPending ? 'Ukládám…' : 'Zaplaceno — označit jako vyplacené'}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
