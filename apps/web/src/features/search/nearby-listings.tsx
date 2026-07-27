'use client'

import type { SearchResultItem } from '@rocket/core'
import { useCallback, useEffect, useState } from 'react'
import { ListingCard } from '@/components/listing/listing-card'
import { Skeleton } from '@/components/ui/skeleton'

type NearbyState =
  | { status: 'loading' }
  | { status: 'unavailable'; message: string }
  | { status: 'ready'; items: SearchResultItem[] }

/** Sekce „V okolí" — načte polohu z prohlížeče a zobrazí nejbližší inzeráty. */
export function NearbyListings() {
  const [state, setState] = useState<NearbyState>({ status: 'loading' })

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(`/api/okoli?lat=${lat}&lng=${lng}`)
      if (!response.ok) throw new Error(`Server vrátil ${response.status}`)
      const data = (await response.json()) as { items: SearchResultItem[] }
      setState({ status: 'ready', items: data.items })
    } catch {
      setState({ status: 'unavailable', message: 'Nabídky v okolí se nepodařilo načíst.' })
    }
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', message: 'Prohlížeč neumožňuje zjistit polohu.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => void loadNearby(position.coords.latitude, position.coords.longitude),
      () => {
        setState({
          status: 'unavailable',
          message: 'Bez povolení polohy nedokážeme nabídky v okolí najít.',
        })
      },
      { maximumAge: 5 * 60 * 1000, timeout: 10_000 },
    )
  }, [loadNearby])

  if (state.status === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-lg" />
        ))}
      </div>
    )
  }

  if (state.status === 'unavailable') {
    return <p className="py-8 text-center text-sm text-muted-foreground">{state.message}</p>
  }

  if (state.items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ve vašem okolí zatím žádné nabídky nejsou.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {state.items.map((item) => (
        <ListingCard key={item.id} item={item} />
      ))}
    </div>
  )
}
