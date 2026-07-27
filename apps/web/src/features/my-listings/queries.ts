import { getDb, listingMedia, listings } from '@rocket/db'
import { LISTING_STATUSES } from '@rocket/shared'
import type { Currency, ListingStatus, PriceUnit } from '@rocket/shared'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { mediaVariantUrl } from '@/lib/media'

export interface MyListingItem {
  id: string
  slug: string
  title: string
  status: ListingStatus
  priceAmount: number | null
  priceCurrency: Currency
  priceUnit: PriceUnit
  priceHidden: boolean
  viewCount: number
  publishedAt: Date | null
  validUntil: Date | null
  toppedUntil: Date | null
  rejectedReason: string | null
  updatedAt: Date
  thumbnailUrl: string | null
}

export type ListingCountsByStatus = Record<ListingStatus, number>

/** Počty inzerátů uživatele podle stavu (bez smazaných). */
export async function getListingCounts(userId: string): Promise<ListingCountsByStatus> {
  const db = getDb()
  const rows = await db
    .select({ status: listings.status, total: count() })
    .from(listings)
    .where(and(eq(listings.ownerUserId, userId), isNull(listings.deletedAt)))
    .groupBy(listings.status)

  const counts = Object.fromEntries(
    LISTING_STATUSES.map((status) => [status, 0]),
  ) as ListingCountsByStatus
  for (const row of rows) {
    counts[row.status] = row.total
  }
  return counts
}

/** Inzeráty uživatele s náhledem první fotky, seřazené od naposledy upravených. */
export async function getMyListings(
  userId: string,
  status?: ListingStatus,
  limit?: number,
): Promise<MyListingItem[]> {
  const db = getDb()
  const conditions = [eq(listings.ownerUserId, userId), isNull(listings.deletedAt)]
  if (status) conditions.push(eq(listings.status, status))

  const baseQuery = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      viewCount: listings.viewCount,
      publishedAt: listings.publishedAt,
      validUntil: listings.validUntil,
      toppedUntil: listings.toppedUntil,
      rejectedReason: listings.rejectedReason,
      updatedAt: listings.updatedAt,
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.updatedAt))
  const rows = limit ? await baseQuery.limit(limit) : await baseQuery

  if (rows.length === 0) return []

  const media = await db
    .select({
      listingId: listingMedia.listingId,
      storageKey: listingMedia.storageKey,
      variants: listingMedia.variants,
    })
    .from(listingMedia)
    .where(
      and(
        inArray(
          listingMedia.listingId,
          rows.map((row) => row.id),
        ),
        eq(listingMedia.kind, 'foto'),
      ),
    )
    .orderBy(listingMedia.position)

  const thumbnailByListing = new Map<string, string>()
  for (const item of media) {
    if (!thumbnailByListing.has(item.listingId)) {
      thumbnailByListing.set(
        item.listingId,
        mediaVariantUrl(item.storageKey, item.variants, 'thumb'),
      )
    }
  }

  return rows.map((row) => ({ ...row, thumbnailUrl: thumbnailByListing.get(row.id) ?? null }))
}
