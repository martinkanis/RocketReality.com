'use client'

import { ARCHIVE_REASONS, ARCHIVE_REASON_LABELS } from '@rocket/shared'
import type { ArchiveReason } from '@rocket/shared'
import { Archive, Pencil, RefreshCw, Rocket, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  archiveListingAction,
  boostListingAction,
  deleteDraftListing,
  extendListingAction,
} from './actions'
import type { ListingActionResult } from './actions'

/** Sdílený stav pro spouštění server actions s inline chybou. */
function useListingAction() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<ListingActionResult>, onSuccess?: () => void): void {
    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.ok) {
          setError(result.error)
          return
        }
        onSuccess?.()
      } catch {
        setError('Akce se nepodařila, zkuste to prosím znovu.')
      }
    })
  }

  return { isPending, error, run }
}

function ActionError({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-xs text-destructive">{error}</p>
}

export function DraftActions({ listingId }: { listingId: string }) {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const { isPending, error, run } = useListingAction()

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/vlozit-inzerat?id=${listingId}`}>
            <Pencil />
            Pokračovat
          </Link>
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive-bg">
              <Trash2 />
              Smazat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat koncept?</DialogTitle>
              <DialogDescription>
                Rozpracovaný inzerát bude odstraněn. Tuto akci nelze vzít zpět.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Zrušit</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => deleteDraftListing(listingId),
                    () => setDialogOpen(false),
                  )
                }
              >
                {isPending ? 'Mažu…' : 'Smazat koncept'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <ActionError error={error} />
    </div>
  )
}

function ArchiveDialog({ listingId }: { listingId: string }) {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState<ArchiveReason>('prodano')
  const { isPending, error, run } = useListingAction()

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Archive />
          Archivovat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivovat inzerát</DialogTitle>
          <DialogDescription>
            Inzerát bude stažen z nabídky. Vyberte prosím důvod archivace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {ARCHIVE_REASONS.map((archiveReason) => (
            <label
              key={archiveReason}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors',
                reason === archiveReason
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-border hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="archiveReason"
                value={archiveReason}
                checked={reason === archiveReason}
                onChange={() => setReason(archiveReason)}
                className="accent-brand-500"
              />
              <span className="text-sm font-medium text-heading">
                {ARCHIVE_REASON_LABELS[archiveReason]}
              </span>
            </label>
          ))}
        </div>
        <ActionError error={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušit</Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () => archiveListingAction(listingId, reason),
                () => setDialogOpen(false),
              )
            }
          >
            {isPending ? 'Archivuji…' : 'Archivovat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ActiveActions({ listingId, isTopped }: { listingId: string; isTopped: boolean }) {
  const { isPending, error, run } = useListingAction()

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="accent"
          disabled={isPending || isTopped}
          onClick={() => run(() => boostListingAction(listingId))}
        >
          <Rocket />
          {isTopped ? 'Topováno' : 'Topovat'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => extendListingAction(listingId))}
        >
          <RefreshCw />
          Prodloužit
        </Button>
        <ArchiveDialog listingId={listingId} />
      </div>
      <ActionError error={error} />
    </div>
  )
}

export function RejectedActions({ listingId }: { listingId: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/vlozit-inzerat?id=${listingId}`}>
        <Pencil />
        Upravit a znovu odeslat
      </Link>
    </Button>
  )
}

export function ExpiredActions({ listingId }: { listingId: string }) {
  const { isPending, error, run } = useListingAction()

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => extendListingAction(listingId))}
      >
        <RefreshCw />
        {isPending ? 'Prodlužuji…' : 'Prodloužit'}
      </Button>
      <ActionError error={error} />
    </div>
  )
}
