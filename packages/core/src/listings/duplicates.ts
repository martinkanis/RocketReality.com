import { getDb, listingMedia, listings, moderationCases } from '@rocket/db'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { findBestDuplicate, type DuplicateCandidate, type DuplicateMatch } from './duplicate-rules'

/** Okruh, ve kterém vůbec hledáme kandidáty; užší rozhodnutí dělají pravidla. */
const SEARCH_RADIUS_METERS = 150

/** Kolik kandidátů nejvýše posuzujeme — v hustém sídlišti jich může být hodně. */
const MAX_CANDIDATES = 50

/** Stavy, ve kterých inzerát obsazuje nabídku a má smysl ho porovnávat. */
const COMPARABLE_STATUSES = ['active', 'pending_review'] as const

/**
 * Najde inzeráty, které nabízejí tutéž nemovitost. Předvýběr dělá databáze
 * (stejná kategorie, typ nabídky, dispozice a okruh kolem polohy), konečné
 * rozhodnutí patří pravidlům v duplicate-rules.
 */
export async function findDuplicateOf(listingId: string): Promise<DuplicateMatch | null> {
  const db = getDb()
  const [subject] = await db
    .select({
      id: listings.id,
      transaction: listings.transaction,
      categoryMainId: listings.categoryMainId,
      disposition: listings.disposition,
      areaUsable: listings.areaUsable,
      street: listings.street,
      locationPoint: listings.locationPoint,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1)
  if (!subject) return null

  const listingsWithSharedPhoto = await findListingsWithSharedPhoto(listingId)
  const candidates = await db
    .select({
      listingId: listings.id,
      areaUsable: listings.areaUsable,
      street: listings.street,
      distanceMeters: sql<number>`ST_Distance(${listings.locationPoint}::geography, ST_SetSRID(ST_MakePoint(${subject.locationPoint.x}, ${subject.locationPoint.y}), 4326)::geography)`,
    })
    .from(listings)
    .where(
      and(
        ne(listings.id, listingId),
        isNull(listings.deletedAt),
        sql`${listings.status} = ANY(ARRAY[${sql.join(
          COMPARABLE_STATUSES.map((status) => sql`${status}`),
          sql`, `,
        )}]::listing_status[])`,
        eq(listings.transaction, subject.transaction),
        eq(listings.categoryMainId, subject.categoryMainId),
        sql`${listings.disposition} IS NOT DISTINCT FROM ${subject.disposition}`,
        sql`ST_DWithin(${listings.locationPoint}::geography, ST_SetSRID(ST_MakePoint(${subject.locationPoint.x}, ${subject.locationPoint.y}), 4326)::geography, ${SEARCH_RADIUS_METERS})`,
      ),
    )
    .limit(MAX_CANDIDATES)

  // Inzerát se shodnou fotkou je duplicitou i mimo okruh — doplníme ho zvlášť.
  const candidatesById = new Map<string, DuplicateCandidate>()
  for (const row of candidates) {
    candidatesById.set(row.listingId, { ...row, sharesPhoto: false })
  }
  for (const shared of listingsWithSharedPhoto) {
    const existing = candidatesById.get(shared.listingId)
    candidatesById.set(shared.listingId, {
      listingId: shared.listingId,
      areaUsable: existing?.areaUsable ?? shared.areaUsable,
      street: existing?.street ?? shared.street,
      distanceMeters: existing?.distanceMeters ?? null,
      sharesPhoto: true,
    })
  }

  return findBestDuplicate(subject, [...candidatesById.values()])
}

/** Inzeráty sdílející fotku se shodným obsahem — fotka patří ke konkrétní nemovitosti. */
async function findListingsWithSharedPhoto(listingId: string) {
  const db = getDb()
  const ownPhotos = db.$with('own_photos').as(
    db
      .select({ contentHash: listingMedia.contentHash })
      .from(listingMedia)
      .where(
        and(eq(listingMedia.listingId, listingId), sql`${listingMedia.contentHash} IS NOT NULL`),
      ),
  )

  return db
    .with(ownPhotos)
    .selectDistinctOn([listings.id], {
      listingId: listings.id,
      areaUsable: listings.areaUsable,
      street: listings.street,
    })
    .from(listingMedia)
    .innerJoin(listings, eq(listingMedia.listingId, listings.id))
    .innerJoin(ownPhotos, eq(listingMedia.contentHash, ownPhotos.contentHash))
    .where(and(ne(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(MAX_CANDIDATES)
}

/**
 * Označí čerstvě založený moderační případ jako podezření na duplicitu.
 * Inzerát se nikdy nezamítá automaticky — v novostavbě bývají shodné byty
 * legitimně, takže rozhoduje moderátor.
 */
export async function flagDuplicateForModeration(
  listingId: string,
): Promise<DuplicateMatch | null> {
  const match = await findDuplicateOf(listingId)
  if (!match) return null

  await getDb()
    .update(moderationCases)
    .set({
      reasonCode: 'duplicita',
      note: `Podezření na duplicitu inzerátu ${match.listingId} — ${match.reason}.`,
    })
    .where(and(eq(moderationCases.listingId, listingId), eq(moderationCases.status, 'pending')))

  return match
}
