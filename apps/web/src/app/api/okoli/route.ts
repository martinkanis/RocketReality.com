import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'

const RESULT_LIMIT = 8

/** Klíč varianty „card" z JSONB variants — stejná konvence jako v PostgresListingSearch. */
function extractCardVariantKey(variants: unknown): string | null {
  if (variants && typeof variants === 'object' && 'card' in variants) {
    const card = (variants as Record<string, unknown>).card
    return typeof card === 'string' ? card : null
  }
  return null
}

/** Nejbližší aktivní inzeráty k dané poloze (?lat=&lng=) — sekce „V okolí". */
export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get('lat')
  const lngParam = request.nextUrl.searchParams.get('lng')
  const lat = latParam === null || latParam === '' ? Number.NaN : Number(latParam)
  const lng = lngParam === null || lngParam === '' ? Number.NaN : Number(lngParam)
  const isValidLatitude = Number.isFinite(lat) && Math.abs(lat) <= 90
  const isValidLongitude = Number.isFinite(lng) && Math.abs(lng) <= 180
  if (!isValidLatitude || !isValidLongitude) {
    return NextResponse.json(
      { error: 'Parametry lat a lng musí být platné souřadnice' },
      { status: 400 },
    )
  }

  const origin = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`
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
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .leftJoin(coverPhoto, eq(coverPhoto.listingId, listings.id))
    .where(and(eq(listings.status, 'active'), isNull(listings.deletedAt)))
    .orderBy(sql`${listings.locationPoint} <-> ${origin}`)
    .limit(RESULT_LIMIT)

  return NextResponse.json({
    items: rows.map(({ coverVariants, ...row }) => ({
      ...row,
      coverPhotoUrl: extractCardVariantKey(coverVariants),
    })),
  })
}
