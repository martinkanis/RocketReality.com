import { PostgresListingSearch, searchQuerySchema, type SearchResultItem } from '@rocket/core'
import {
  agencies,
  districts,
  getDb,
  listingMedia,
  listings,
  municipalities,
  users,
} from '@rocket/db'
import { CATEGORY_MAIN_BY_ID } from '@rocket/shared'
import { and, asc, eq } from 'drizzle-orm'
import { cache } from 'react'

export type ListingRow = typeof listings.$inferSelect
export type ListingMediaRow = typeof listingMedia.$inferSelect

export interface ListingAgency {
  name: string
  slug: string
  logoKey: string | null
}

export interface ListingDetail {
  listing: ListingRow
  municipalityName: string
  districtName: string
  districtSlug: string
  agency: ListingAgency | null
  ownerName: string
  media: ListingMediaRow[]
}

/**
 * Detail inzerátu podle slugu včetně lokality, inzerenta a fotografií.
 * Vrací i smazané a jinak neveřejné inzeráty — o tom, kdo smí co vidět,
 * rozhoduje volající (vlastník náhledu konceptu, admin vidí vše).
 */
export const getListingDetailBySlug = cache(async (slug: string): Promise<ListingDetail | null> => {
  const db = getDb()
  const [row] = await db
    .select({
      listing: listings,
      municipalityName: municipalities.name,
      districtName: districts.name,
      districtSlug: districts.slug,
      agencyName: agencies.name,
      agencySlug: agencies.slug,
      agencyLogoKey: agencies.logoKey,
      ownerName: users.name,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .leftJoin(agencies, eq(listings.agencyId, agencies.id))
    .where(eq(listings.slug, slug))
    .limit(1)
  if (!row) return null

  const media = await db
    .select()
    .from(listingMedia)
    .where(
      and(
        eq(listingMedia.listingId, row.listing.id),
        eq(listingMedia.kind, 'foto'),
        eq(listingMedia.isReady, true),
      ),
    )
    .orderBy(asc(listingMedia.position))

  return {
    listing: row.listing,
    municipalityName: row.municipalityName,
    districtName: row.districtName,
    districtSlug: row.districtSlug,
    agency:
      row.agencyName && row.agencySlug
        ? { name: row.agencyName, slug: row.agencySlug, logoKey: row.agencyLogoKey }
        : null,
    ownerName: row.ownerName,
    media,
  }
})

const similarSearch = new PostgresListingSearch()

/** Podobné inzeráty: stejná kategorie, transakce a okres, bez aktuálního inzerátu. */
export async function getSimilarListings(
  detail: ListingDetail,
  limit: number,
): Promise<SearchResultItem[]> {
  const category = CATEGORY_MAIN_BY_ID.get(detail.listing.categoryMainId)
  if (!category) return []
  const query = searchQuerySchema.parse({
    transaction: detail.listing.transaction,
    categoryMain: category.slug,
    district: detail.districtSlug,
    pageSize: limit + 1,
  })
  const result = await similarSearch.search(query)
  return result.items.filter((item) => item.id !== detail.listing.id).slice(0, limit)
}
