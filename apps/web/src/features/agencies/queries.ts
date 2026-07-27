import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { formatPrice } from '@rocket/shared'
import { and, asc, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { mediaVariantUrl } from '@/lib/media'

export interface AgencyListingCardData {
  id: string
  slug: string
  title: string
  price: string
  locality: string
  photoUrl: string | null
}

export interface AgencyListingPage {
  items: AgencyListingCardData[]
  total: number
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

/** Stránka aktivních inzerátů podle podmínky (RK nebo makléř) s daty pro karty. */
export async function loadActiveListingCards(
  where: SQL,
  page: number,
  pageSize: number,
): Promise<AgencyListingPage> {
  const db = getDb()
  const condition = and(where, eq(listings.status, 'active'))
  const total = await db.$count(listings, condition)
  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      municipalityName: municipalities.name,
      districtName: districts.name,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .where(condition)
    .orderBy(desc(listings.publishedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const coverPhotos = await loadCoverPhotoUrls(rows.map((row) => row.id))
  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      price: formatPrice({
        amount: row.priceAmount,
        currency: row.priceCurrency,
        unit: row.priceUnit,
        hidden: row.priceHidden,
      }),
      locality: `${row.municipalityName}, okres ${row.districtName}`,
      photoUrl: coverPhotos.get(row.id) ?? null,
    })),
  }
}
