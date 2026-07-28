'use client'

import type { ListingStatus } from '@rocket/shared'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  approveListingFromAdminAction,
  deleteListingFromAdminAction,
  pauseListingFromAdminAction,
  resumeListingFromAdminAction,
  type AdminListingActionResult,
} from './listing-actions'

interface ListingRowActionsProps {
  listingId: string
  status: ListingStatus
}

/** Akce nad inzerátem přímo v admin výpisu — schválení, pozastavení, smazání. */
export function ListingRowActions({ listingId, status }: ListingRowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function run(action: () => Promise<AdminListingActionResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) setError(result.error)
      else setConfirmDelete(false)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {status === 'pending_review' ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => approveListingFromAdminAction(listingId))}
          >
            Schválit
          </Button>
        ) : null}
        {status === 'active' ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => pauseListingFromAdminAction(listingId))}
          >
            Pozastavit
          </Button>
        ) : null}
        {status === 'paused' ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => resumeListingFromAdminAction(listingId))}
          >
            Obnovit
          </Button>
        ) : null}
        {confirmDelete ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => run(() => deleteListingFromAdminAction(listingId))}
            >
              Opravdu smazat
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Zpět
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            Smazat
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
