import type { SearchResultItem } from '@rocket/core'
import { districts, favorites, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

/** Klíč varianty „card" z JSONB variants — stejná konvence jako v PostgresListingSearch. */
function extractCardVariantKey(variants: unknown): string | null {
  if (variants && typeof variants === 'object' && 'card' in variants) {
    const card = (variants as Record<string, unknown>).card
    return typeof card === 'string' ? card : null
  }
  return null
}

/** Uložené (oblíbené) aktivní inzeráty uživatele ve tvaru karty — pro homepage. */
export async function getFavoriteListingItems(
  userId: string,
  limit: number,
): Promise<SearchResultItem[]> {
  const db = getDb()

  const coverPhoto = db.$with('cover_photo').as(
    db
      .selectDistinctOn([listingMedia.listingId], {
        listingId: listingMedia.listingId,
        variants: listingMedia.variants,
      })
      .from(listingMedia)
      .where(and(eq(listingMedia.kind, 'foto'), eq(listingMedia.isReady, true)))
      .orderBy(listingMedia.listingId, asc(listingMedia.position)),
  )

  const rows = await db
    .with(coverPhoto)
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      transaction: listings.transaction,
      categoryMainId: listings.categoryMainId,
      disposition: listings.disposition,
      priceAmount: listings.priceAmount,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      areaUsable: listings.areaUsable,
      areaLand: listings.areaLand,
      municipalityName: municipalities.name,
      districtName: districts.name,
      street: listings.street,
      lat: sql<number>`ST_Y(${listings.locationPoint})`,
      lng: sql<number>`ST_X(${listings.locationPoint})`,
      isTopped: sql<boolean>`coalesce(${listings.toppedUntil} > now(), false)`,
      publishedAt: listings.publishedAt,
      coverVariants: coverPhoto.variants,
    })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .leftJoin(coverPhoto, eq(coverPhoto.listingId, listings.id))
    .where(
      and(eq(favorites.userId, userId), eq(listings.status, 'active'), isNull(listings.deletedAt)),
    )
    .orderBy(desc(favorites.createdAt))
    .limit(limit)

  return rows.map(({ coverVariants, ...row }) => ({
    ...row,
    coverPhotoUrl: extractCardVariantKey(coverVariants),
  }))
}
