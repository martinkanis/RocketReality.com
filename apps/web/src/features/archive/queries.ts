import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import {
  ARCHIVE_VISIBILITY_DAYS,
  PUBLIC_ARCHIVE_REASONS,
  formatPrice,
  type ArchiveReason,
} from '@rocket/shared'
import { and, asc, desc, eq, gte, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import { mediaVariantUrl } from '@/lib/media'

export interface ArchivedListingCard {
  id: string
  slug: string
  title: string
  price: string
  locality: string
  photoUrl: string | null
  reason: ArchiveReason
  archivedAt: Date | null
}

export interface ArchivedListingPage {
  items: ArchivedListingCard[]
  total: number
}

/** Hranice, od které je archivovaná nabídka ještě veřejně dohledatelná. */
export function archiveVisibleSince(): Date {
  const date = new Date()
  date.setDate(date.getDate() - ARCHIVE_VISIBILITY_DAYS)
  return date
}

/**
 * Podmínka veřejného archivu: prodané/pronajaté nabídky, které byly archivované
 * nejvýše před ARCHIVE_VISIBILITY_DAYS dny a nejsou smazané.
 */
export function publicArchiveCondition(): SQL {
  return and(
    eq(listings.status, 'archived'),
    isNull(listings.deletedAt),
    inArray(listings.archiveReason, [...PUBLIC_ARCHIVE_REASONS]),
    gte(listings.statusChangedAt, archiveVisibleSince()),
  )!
}

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

/** Stránka archivovaných nabídek, od naposledy archivovaných. */
export async function loadArchivedListingCards(
  page: number,
  pageSize: number,
  extraCondition?: SQL,
): Promise<ArchivedListingPage> {
  const db = getDb()
  const condition = extraCondition
    ? and(publicArchiveCondition(), extraCondition)!
    : publicArchiveCondition()

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
      archiveReason: listings.archiveReason,
      statusChangedAt: listings.statusChangedAt,
      municipalityName: municipalities.name,
      districtName: districts.name,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .where(condition)
    .orderBy(desc(listings.statusChangedAt))
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
      // Podmínka archivu zaručuje, že důvod je jeden z PUBLIC_ARCHIVE_REASONS.
      reason: row.archiveReason as ArchiveReason,
      archivedAt: row.statusChangedAt,
    })),
  }
}

/** Počty archivovaných nabídek podle důvodu — pro popisek sekce. */
export async function getArchiveCounts(): Promise<{ prodano: number; pronajato: number }> {
  const db = getDb()
  const [row] = await db
    .select({
      prodano: sql<number>`count(*) FILTER (WHERE ${listings.archiveReason} = 'prodano')::int`,
      pronajato: sql<number>`count(*) FILTER (WHERE ${listings.archiveReason} = 'pronajato')::int`,
    })
    .from(listings)
    .where(publicArchiveCondition())

  return { prodano: row?.prodano ?? 0, pronajato: row?.pronajato ?? 0 }
}
