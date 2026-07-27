'use client'

import { Heart } from 'lucide-react'
import { useOptimistic, useTransition, type MouseEvent } from 'react'
import { toggleFavorite } from '@/features/favorites/actions'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  listingId: string
  isFavorite: boolean
  /** `overlay` = kulaté srdíčko přes fotku karty, `row` = řádek s textem pro detail. */
  variant?: 'overlay' | 'row'
  className?: string
}

export function FavoriteButton({
  listingId,
  isFavorite,
  variant = 'overlay',
  className,
}: FavoriteButtonProps) {
  const [, startTransition] = useTransition()
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite)

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Srdíčko bývá vložené v odkazu karty — klik nesmí otevřít detail inzerátu
    event.preventDefault()
    event.stopPropagation()
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite)
      await toggleFavorite(listingId)
    })
  }

  const label = optimisticFavorite ? 'V oblíbených' : 'Uložit do oblíbených'
  const heartClassName = cn(
    'size-5 transition-colors',
    optimisticFavorite ? 'fill-destructive text-destructive' : 'text-heading',
  )

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-heading transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <Heart className={heartClassName} />
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={optimisticFavorite ? 'Odebrat z oblíbených' : 'Uložit do oblíbených'}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-surface shadow-soft transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Heart className={heartClassName} />
    </button>
  )
}
