import { CATEGORY_MAIN_BY_SLUG } from '@rocket/shared'
import { getDb, districts, listingMedia, listings, municipalities } from '@rocket/db'
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import type { ListingSearchPort, SearchQuery, SearchResult, SearchResultItem } from './query'

/** V1 vyhledávání nad Postgresem (composite indexy + PostGIS + FTS). */
export class PostgresListingSearch implements ListingSearchPort {
  async search(query: SearchQuery): Promise<SearchResult> {
    const db = getDb()

    const categoryMain = CATEGORY_MAIN_BY_SLUG.get(query.categoryMain)
    if (!categoryMain) {
      return { items: [], total: 0, page: query.page, pageSize: query.pageSize }
    }

    const where = and(...buildSearchConditions(query, categoryMain.id))
    const toppedFirst = desc(sql`${listings.toppedUntil} > now()`)
    const orderBy =
      query.sort === 'nejlevnejsi'
        ? [toppedFirst, sql`${listings.priceAmount} ASC NULLS LAST`]
        : query.sort === 'nejdrazsi'
          ? [toppedFirst, sql`${listings.priceAmount} DESC NULLS LAST`]
          : [toppedFirst, desc(listings.publishedAt)]

    const coverPhoto = db.$with('cover_photo').as(
      db
        .selectDistinctOn([listingMedia.listingId], {
          listingId: listingMedia.listingId,
          variants: listingMedia.variants,
          storageKey: listingMedia.storageKey,
        })
        .from(listingMedia)
        .where(and(eq(listingMedia.kind, 'foto'), eq(listingMedia.isReady, true)))
        .orderBy(listingMedia.listingId, asc(listingMedia.position)),
    )

    const baseQuery = db
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
        total: sql<number>`count(*) OVER ()::int`,
      })
      .from(listings)
      .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
      .innerJoin(districts, eq(listings.districtId, districts.id))
      .leftJoin(coverPhoto, eq(coverPhoto.listingId, listings.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)

    const rows = await baseQuery
    const items: SearchResultItem[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      transaction: row.transaction,
      categoryMainId: row.categoryMainId,
      disposition: row.disposition,
      priceAmount: row.priceAmount,
      priceUnit: row.priceUnit,
      priceHidden: row.priceHidden,
      areaUsable: row.areaUsable,
      areaLand: row.areaLand,
      municipalityName: row.municipalityName,
      districtName: row.districtName,
      street: row.street,
      lat: row.lat,
      lng: row.lng,
      isTopped: row.isTopped,
      publishedAt: row.publishedAt,
      coverPhotoUrl: extractCardVariant(row.coverVariants),
    }))

    return {
      items,
      total: rows[0]?.total ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
}

/** Sestaví WHERE podmínky pro vyhledávací dotaz; exportováno kvůli testům generovaného SQL. */
export function buildSearchConditions(query: SearchQuery, categoryMainId: number): SQL[] {
  const conditions: SQL[] = [eq(listings.status, 'active'), sql`${listings.deletedAt} IS NULL`]
  conditions.push(eq(listings.transaction, query.transaction))
  conditions.push(eq(listings.categoryMainId, categoryMainId))

  if (query.disposition?.length) {
    conditions.push(inArray(listings.disposition, query.disposition))
  }
  if (query.kraj) {
    conditions.push(sql`${listings.kraj} = ${query.kraj}`)
  }
  if (query.district) {
    conditions.push(eq(districts.slug, query.district))
  }
  if (query.municipality) {
    conditions.push(eq(municipalities.slug, query.municipality))
  }
  if (query.priceMin !== undefined) {
    conditions.push(gte(listings.priceAmount, query.priceMin))
  }
  if (query.priceMax !== undefined) {
    conditions.push(lte(listings.priceAmount, query.priceMax))
  }
  if (query.areaMin !== undefined) {
    conditions.push(sql`coalesce(${listings.areaUsable}, ${listings.areaLand}) >= ${query.areaMin}`)
  }
  if (query.areaMax !== undefined) {
    conditions.push(sql`coalesce(${listings.areaUsable}, ${listings.areaLand}) <= ${query.areaMax}`)
  }
  if (query.ownership?.length) {
    conditions.push(inArray(listings.ownership, query.ownership))
  }
  if (query.buildingType?.length) {
    conditions.push(inArray(listings.buildingType, query.buildingType))
  }
  if (query.buildingCondition?.length) {
    conditions.push(inArray(listings.buildingCondition, query.buildingCondition))
  }
  if (query.furnishing?.length) {
    conditions.push(inArray(listings.furnishing, query.furnishing))
  }
  if (query.energyLabelMax) {
    conditions.push(sql`${listings.energyLabel} <= ${query.energyLabelMax}`)
  }
  for (const flag of [
    'hasBalcony',
    'hasTerrace',
    'hasCellar',
    'hasElevator',
    'hasGarage',
    'hasParking',
  ] as const) {
    if (query[flag]) {
      conditions.push(eq(listings[flag], true))
    }
  }
  if (query.fulltext) {
    conditions.push(
      sql`${listings.searchVector} @@ websearch_to_tsquery('simple', immutable_unaccent(${query.fulltext}))`,
    )
  }
  if (query.bbox) {
    const [west, south, east, north] = query.bbox
    conditions.push(
      sql`ST_Intersects(${listings.locationPoint}, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`,
    )
  }

  return conditions
}

function extractCardVariant(variants: unknown): string | null {
  if (variants && typeof variants === 'object' && 'card' in variants) {
    const card = (variants as Record<string, unknown>).card
    return typeof card === 'string' ? card : null
  }
  return null
}
