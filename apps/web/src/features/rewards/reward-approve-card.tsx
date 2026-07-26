'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { approveRewardAction, rejectRewardAction } from './actions'

interface RewardApproveCardProps {
  id: string
  iban: string
  amountCzk: number
  listingTitle: string
  listingSlug: string
  listingStatus: string
  ibanPayoutCount: number
}

export function RewardApproveCard(props: RewardApproveCardProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch {
        setError('Akce se nepodařila — obnovte stránku.')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            {props.listingStatus === 'active' ? (
              <Link href={`/detail/${props.listingSlug}`} className="hover:text-primary">
                {props.listingTitle}
              </Link>
            ) : (
              props.listingTitle
            )}
          </CardTitle>
          <p className="font-mono text-sm text-muted-foreground">{props.iban}</p>
        </div>
        <Badge variant="accent">{props.amountCzk} Kč</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {props.ibanPayoutCount > 0 ? (
          <p className="rounded-sm bg-warning-bg px-3 py-2 text-sm text-warning">
            Pozor: tento IBAN už má {props.ibanPayoutCount}× schválenou nebo vyplacenou odměnu.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Před schválením zkontrolujte fotky inzerátu a že QR platba je legitimní.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => run(() => approveRewardAction(props.id))} disabled={isPending}>
            {isPending ? 'Pracuji…' : `Schválit odměnu ${props.amountCzk} Kč`}
          </Button>
          <Button
            variant="outline"
            onClick={() => run(() => rejectRewardAction(props.id, 'Zamítnuto adminem'))}
            disabled={isPending}
          >
            Zamítnout
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
