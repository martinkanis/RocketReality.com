'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/features/favorites/actions'

interface RemoveFavoriteButtonProps {
  listingId: string
}

/** Odebrání inzerátu ze seznamu oblíbených (toggle nad existující položkou). */
export function RemoveFavoriteButton({ listingId }: RemoveFavoriteButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      await toggleFavorite(listingId)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={isPending}
      className="text-destructive hover:bg-destructive-bg hover:text-destructive"
    >
      <Trash2 />
      {isPending ? 'Odebírám…' : 'Odebrat'}
    </Button>
  )
}
