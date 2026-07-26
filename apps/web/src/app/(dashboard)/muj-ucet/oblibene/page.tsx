import { districts, favorites, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { formatPrice } from '@rocket/shared'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FavoriteNoteForm } from '@/features/favorites/favorite-note-form'
import { RemoveFavoriteButton } from '@/features/favorites/remove-favorite-button'
import { mediaVariantUrl } from '@/lib/media'
import { requireUser } from '@/lib/require-user'

export const metadata: Metadata = { title: 'Oblíbené inzeráty' }

interface FavoriteListing {
  listingId: string
  note: string | null
  priceAtSave: string | null
  slug: string
  title: string
  currentPrice: string
  locality: string
  photoUrl: string | null
}

/** Titulní fotky inzerátů — první foto podle pozice, varianta „card". */
async function loadCoverPhotoUrls(listingIds: string[]): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map()
  const media = await getDb()
    .select({
      listingId: listingMedia.listingId,
      storageKey: listingMedia.storageKey,
      variants: listingMedia.variants,
    })
    .from(listingMedia)
    .where(and(inArray(listingMedia.listingId, listingIds), eq(listingMedia.kind, 'foto')))
    .orderBy(asc(listingMedia.position))
  const coverByListing = new Map<string, string>()
  for (const item of media) {
    if (!coverByListing.has(item.listingId)) {
      coverByListing.set(item.listingId, mediaVariantUrl(item.storageKey, item.variants, 'card'))
    }
  }
  return coverByListing
}

async function loadFavoriteListings(userId: string): Promise<FavoriteListing[]> {
  const rows = await getDb()
    .select({
      listingId: favorites.listingId,
      note: favorites.note,
      priceAtSave: favorites.priceAtSave,
      slug: listings.slug,
      title: listings.title,
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      municipalityName: municipalities.name,
      districtName: districts.name,
    })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))

  const coverPhotos = await loadCoverPhotoUrls(rows.map((row) => row.listingId))
  return rows.map((row) => ({
    listingId: row.listingId,
    note: row.note,
    priceAtSave: row.priceAtSave,
    slug: row.slug,
    title: row.title,
    currentPrice: formatPrice({
      amount: row.priceAmount,
      currency: row.priceCurrency,
      unit: row.priceUnit,
      hidden: row.priceHidden,
    }),
    locality: `${row.municipalityName}, okres ${row.districtName}`,
    photoUrl: coverPhotos.get(row.listingId) ?? null,
  }))
}

export default async function FavoritesPage() {
  const user = await requireUser()
  const items = await loadFavoriteListings(user.id)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-heading">Oblíbené inzeráty</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {items.length === 0
          ? 'Zatím nemáte žádné oblíbené inzeráty.'
          : `Uložených inzerátů: ${items.length}.`}
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Inzeráty si uložíte srdíčkem ve výpisu nebo na detailu nemovitosti.
          </p>
          <Button asChild>
            <Link href="/prodej/byty">Prozkoumat nabídku</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const isPriceChanged =
              item.priceAtSave !== null && item.priceAtSave !== item.currentPrice
            return (
              <li
                key={item.listingId}
                className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row"
              >
                <Link href={`/detail/${item.slug}`} className="shrink-0">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="h-28 w-full rounded-md object-cover sm:w-40"
                    />
                  ) : (
                    <div
                      className="h-28 w-full rounded-md bg-gradient-to-br from-muted to-surface-alt sm:w-40"
                      aria-hidden
                    />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/detail/${item.slug}`}
                        className="font-semibold text-heading hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.locality}</p>
                    </div>
                    <RemoveFavoriteButton listingId={item.listingId} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-heading">{item.currentPrice}</span>
                    {isPriceChanged ? (
                      <Badge variant="accent">Cena změněna — původně {item.priceAtSave}</Badge>
                    ) : null}
                  </div>
                  <FavoriteNoteForm listingId={item.listingId} note={item.note} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
