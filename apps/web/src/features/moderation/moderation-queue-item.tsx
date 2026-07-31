'use client'

import { MODERATION_REASON_LABELS, MODERATION_REASONS } from '@rocket/shared'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { approveListingAction, rejectListingAction } from './actions'

interface ModerationQueueItemProps {
  listingId: string
  title: string
  description: string
  price: string
  locality: string
  owner: string
  submittedAt: string
  /** Upozornění z automatické kontroly, typicky podezření na duplicitu. */
  flaggedNote?: string | null
}

export function ModerationQueueItem(props: ModerationQueueItemProps) {
  const [isPending, startTransition] = useTransition()
  const [isRejecting, setIsRejecting] = useState(false)
  const [reasonCode, setReasonCode] = useState<string>('nekvalitni_obsah')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function approve() {
    startTransition(async () => {
      try {
        await approveListingAction(props.listingId)
      } catch {
        setError('Schválení se nepodařilo.')
      }
    })
  }

  function reject() {
    if (!note.trim()) {
      setError('Vyplňte zdůvodnění pro inzerenta.')
      return
    }
    startTransition(async () => {
      try {
        await rejectListingAction(props.listingId, reasonCode, note)
      } catch {
        setError('Zamítnutí se nepodařilo.')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{props.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {props.locality} · {props.price}
          </p>
          <p className="text-xs text-muted-foreground">
            Inzerent: {props.owner} · odesláno {props.submittedAt}
          </p>
        </div>
        <Badge variant="muted">Čeká na schválení</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {props.flaggedNote ? (
          <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            {props.flaggedNote}
          </p>
        ) : null}
        <p className="line-clamp-3 whitespace-pre-line text-sm">{props.description}</p>
        {isRejecting ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-alt p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reason-${props.listingId}`}>Důvod zamítnutí</Label>
              <select
                id={`reason-${props.listingId}`}
                className="h-10 rounded-sm border border-border bg-input px-3 text-sm"
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value)}
              >
                {MODERATION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {MODERATION_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`note-${props.listingId}`}>Zdůvodnění pro inzerenta</Label>
              <textarea
                id={`note-${props.listingId}`}
                className="min-h-20 rounded-sm border border-border bg-input p-3 text-sm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Např. Doplňte prosím fotografie a přesnější popis stavu nemovitosti."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={reject} disabled={isPending}>
                Zamítnout inzerát
              </Button>
              <Button variant="ghost" onClick={() => setIsRejecting(false)} disabled={isPending}>
                Zpět
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={approve} disabled={isPending}>
              {isPending ? 'Pracuji…' : 'Schválit a publikovat'}
            </Button>
            <Button variant="outline" onClick={() => setIsRejecting(true)} disabled={isPending}>
              Zamítnout…
            </Button>
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
