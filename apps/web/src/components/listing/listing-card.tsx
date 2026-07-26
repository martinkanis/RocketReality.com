import type { SearchResultItem } from '@rocket/core'
import { PRICE_UNITS, formatArea, formatPrice, type PriceUnit } from '@rocket/shared'
import { House } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { mediaUrl } from '@/lib/media'

function toPriceUnit(value: string): PriceUnit {
  return PRICE_UNITS.find((unit) => unit === value) ?? 'celkem'
}

function formatCardLocation(item: SearchResultItem): string {
  if (item.municipalityName === item.districtName) return item.municipalityName
  return `${item.municipalityName}, okres ${item.districtName}`
}

interface ListingCardProps {
  item: SearchResultItem
  /** null/undefined = srdíčko nezobrazovat (nepřihlášený uživatel, kontext bez dat). */
  isFavorite?: boolean | null
}

/** Karta inzerátu ve výpisu a na homepage. Celá karta je odkaz na detail. */
export function ListingCard({ item, isFavorite }: ListingCardProps) {
  const photoUrl = item.coverPhotoUrl ? mediaUrl(item.coverPhotoUrl) : null
  const area = item.areaUsable ?? item.areaLand
  const price = formatPrice({
    amount: item.priceAmount,
    currency: 'CZK',
    unit: toPriceUnit(item.priceUnit),
    hidden: item.priceHidden,
  })

  return (
    <Link
      href={`/detail/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-shadow outline-none hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-linear-to-br from-brand-100 to-brand-200">
            <House className="size-10 text-brand-400" aria-hidden />
          </div>
        )}
        {item.isTopped && (
          <Badge variant="accent" className="absolute top-3 left-3">
            TOP
          </Badge>
        )}
        {isFavorite !== null && isFavorite !== undefined && (
          <FavoriteButton
            listingId={item.id}
            isFavorite={isFavorite}
            className="absolute top-3 right-3"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-heading">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{formatCardLocation(item)}</p>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span className="font-semibold text-brand-500">{price}</span>
          {area !== null && (
            <span className="text-sm text-muted-foreground">{formatArea(area)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
