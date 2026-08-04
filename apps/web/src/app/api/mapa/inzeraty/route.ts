import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { formatPrice } from '@rocket/shared'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'

import { mediaVariantUrl } from '@/lib/media'

const MAX_FEATURES = 500

/** GeoJSON aktivních inzerátů ve viewportu mapy (?bbox=zapad,jih,vychod,sever). */
export async function GET(request: NextRequest) {
  const bboxParam = request.nextUrl.searchParams.get('bbox')
  const bbox = bboxParam?.split(',').map(Number) ?? []
  const [west, south, east, north] = bbox
  if (
    bbox.length !== 4 ||
    bbox.some((value) => !Number.isFinite(value)) ||
    west === undefined ||
    south === undefined ||
    east === undefined ||
    north === undefined
  ) {
    return NextResponse.json(
      { error: 'Parametr bbox musí mít tvar zapad,jih,vychod,sever' },
      { status: 400 },
    )
  }

  const db = getDb()

  // Titulní fotka inzerátu — první připravená v pořadí, stejně jako ve výpisech.
  const coverPhoto = db.$with('cover_photo').as(
    db
      .selectDistinctOn([listingMedia.listingId], {
        listingId: listingMedia.listingId,
        storageKey: listingMedia.storageKey,
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
      priceAmount: listings.priceAmount,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      isTopped: sql<boolean>`coalesce(${listings.toppedUntil} > now(), false)`,
      municipalityName: municipalities.name,
      districtName: districts.name,
      lat: sql<number>`ST_Y(${listings.locationPoint})`,
      lng: sql<number>`ST_X(${listings.locationPoint})`,
      coverStorageKey: coverPhoto.storageKey,
      coverVariants: coverPhoto.variants,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .leftJoin(coverPhoto, eq(coverPhoto.listingId, listings.id))
    .where(
      and(
        eq(listings.status, 'active'),
        isNull(listings.deletedAt),
        sql`ST_Intersects(${listings.locationPoint}, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`,
      ),
    )
    .limit(MAX_FEATURES)

  return NextResponse.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [row.lng, row.lat] },
      properties: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        price: formatPrice({
          amount: row.priceAmount,
          currency: 'CZK',
          unit: row.priceUnit,
          hidden: row.priceHidden,
        }),
        locality: `${row.municipalityName}, okres ${row.districtName}`,
        photo: row.coverStorageKey
          ? mediaVariantUrl(row.coverStorageKey, row.coverVariants, 'thumb')
          : null,
        topped: row.isTopped,
      },
    })),
  })
}
