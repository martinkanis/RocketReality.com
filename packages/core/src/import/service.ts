import { loadEnv } from '@rocket/config'
import {
  districts,
  getDb,
  importFeeds,
  importJobItems,
  importJobs,
  listingMedia,
  listings,
  municipalities,
} from '@rocket/db'
import type { TransactionType } from '@rocket/shared'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { submitListingForReview } from '../listings/service'

const MAX_IMPORT_PHOTOS = 20

/** Kontrakt POST /api/import/inzeraty — musí odpovídat stránce /api-dokumentace. */
export const importListingSchema = z.object({
  externalId: z.string().min(1).max(200),
  title: z.string().min(5).max(200),
  sourceUrl: z.url().optional(),
  description: z.string().max(20_000).nullish(),
  offerType: z.enum(['sale', 'rent', 'other']),
  propertyType: z.string().max(100).nullish(),
  price: z.number().int().nonnegative().nullish(),
  priceNote: z.string().max(500).optional(),
  currency: z.literal('CZK'),
  size: z.number().positive().optional(),
  location: z.object({
    street: z.string().max(200).optional(),
    city: z.string().min(1).max(200),
    postalCode: z.string().max(10).optional(),
    region: z.string().max(100).optional(),
  }),
  photos: z
    .array(z.object({ url: z.url(), alt: z.string().max(300).optional() }))
    .max(MAX_IMPORT_PHOTOS),
  agent: z
    .object({
      name: z.string().max(200),
      email: z.email().optional(),
      phone: z.string().max(50).optional(),
    })
    .nullish(),
})

export type ImportListingInput = z.infer<typeof importListingSchema>

export interface ImportFeedIdentity {
  id: string
  agencyId: string | null
  createdByUserId: string
}

export interface ImportResult {
  action: 'create' | 'update'
  listingId: string
}

export class ImportValidationError extends Error {}

const TRANSACTION_BY_OFFER_TYPE: Record<ImportListingInput['offerType'], TransactionType> = {
  sale: 'prodej',
  rent: 'pronajem',
  other: 'prodej',
}

const CATEGORY_BY_PROPERTY_TYPE: Record<string, number> = {
  apartment: 1,
  flat: 1,
  byt: 1,
  house: 2,
  dum: 2,
  land: 3,
  pozemek: 3,
  commercial: 4,
  komercni: 4,
}

const CATEGORY_OSTATNI = 5

/**
 * Najde obec podle názvu (bez diakritiky, case-insensitive); kraj z location.region
 * použije k rozlišení stejnojmenných obcí. Vrací i odvozený okres a souřadnice.
 */
async function resolveMunicipality(location: ImportListingInput['location']) {
  const db = getDb()
  const rows = await db
    .select({
      municipalityId: municipalities.id,
      districtId: municipalities.districtId,
      kraj: districts.kraj,
      centroid: municipalities.centroid,
    })
    .from(municipalities)
    .innerJoin(districts, eq(municipalities.districtId, districts.id))
    .where(
      sql`immutable_unaccent(lower(${municipalities.name})) = immutable_unaccent(lower(${location.city}))`,
    )
    .limit(10)

  if (rows.length === 0) {
    throw new ImportValidationError(`Obec "${location.city}" jsme nenašli v číselníku obcí`)
  }
  const match =
    rows.length === 1 || !location.region
      ? rows[0]
      : (rows.find((row) => row.kraj === location.region) ?? rows[0])
  if (!match || !match.centroid) {
    throw new ImportValidationError(`Obec "${location.city}" nemá v číselníku souřadnice`)
  }
  return match
}

function listingValuesFromInput(
  input: ImportListingInput,
  resolved: Awaited<ReturnType<typeof resolveMunicipality>>,
) {
  const categoryKey = input.propertyType?.trim().toLowerCase() ?? ''
  return {
    title: input.title,
    description: input.description ?? '',
    transaction: TRANSACTION_BY_OFFER_TYPE[input.offerType],
    categoryMainId: CATEGORY_BY_PROPERTY_TYPE[categoryKey] ?? CATEGORY_OSTATNI,
    priceAmount: input.price ?? null,
    priceHidden: input.price == null,
    priceNote: input.priceNote ?? null,
    priceUnit: input.offerType === 'rent' ? ('za_mesic' as const) : ('celkem' as const),
    areaUsable: input.size ?? null,
    street: input.location.street ?? null,
    municipalityId: resolved.municipalityId,
    districtId: resolved.districtId,
    kraj: resolved.kraj,
    locationPoint: { x: resolved.centroid!.x, y: resolved.centroid!.y },
    attributes: {
      importAgent: input.agent ?? null,
      importSourceUrl: input.sourceUrl ?? null,
    },
  }
}

/** Sesynchronizuje importované fotky podle sourceUrl — nové přidá, chybějící smaže. */
async function syncImportedPhotos(listingId: string, photos: ImportListingInput['photos']) {
  const db = getDb()
  const existing = await db
    .select({ id: listingMedia.id, sourceUrl: listingMedia.sourceUrl })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, listingId), isNotNull(listingMedia.sourceUrl)))

  const wantedUrls = new Set(photos.map((photo) => photo.url))
  const existingUrls = new Set(existing.map((row) => row.sourceUrl))

  for (const row of existing) {
    if (row.sourceUrl && !wantedUrls.has(row.sourceUrl)) {
      await db.delete(listingMedia).where(eq(listingMedia.id, row.id))
    }
  }

  let position = existing.length
  for (const photo of photos) {
    if (existingUrls.has(photo.url)) continue
    await db.insert(listingMedia).values({
      listingId,
      kind: 'foto',
      position: position++,
      storageKey: `listings/${listingId}/import-${crypto.randomUUID()}`,
      sourceUrl: photo.url,
      alt: photo.alt ?? null,
      isReady: false,
    })
  }
}

/**
 * Upsert inzerátu z importního API podle (feed, externalId). Nový inzerát jde
 * standardní cestou koncept → objednávka publikace → moderace; aktualizace
 * existujícího jen propíše pole a stav nemění.
 */
export async function importListing(
  feed: ImportFeedIdentity,
  input: ImportListingInput,
): Promise<ImportResult> {
  const db = getDb()
  const resolved = await resolveMunicipality(input.location)
  const values = listingValuesFromInput(input, resolved)

  const [existing] = await db
    .select({ id: listings.id, status: listings.status })
    .from(listings)
    .where(and(eq(listings.importFeedId, feed.id), eq(listings.externalId, input.externalId)))
    .limit(1)

  let result: ImportResult
  if (existing) {
    await db.update(listings).set(values).where(eq(listings.id, existing.id))
    await syncImportedPhotos(existing.id, input.photos)
    if (existing.status === 'draft' || existing.status === 'rejected') {
      await submitListingForReview(existing.id, loadEnv().APP_URL)
    }
    result = { action: 'update', listingId: existing.id }
  } else {
    const [inserted] = await db
      .insert(listings)
      .values({
        ...values,
        ownerUserId: feed.createdByUserId,
        agencyId: feed.agencyId,
        importFeedId: feed.id,
        externalId: input.externalId,
        slug: `tmp-${crypto.randomUUID()}`,
        status: 'draft',
      })
      .returning({ id: listings.id })
    if (!inserted) throw new Error('Vložení importovaného inzerátu selhalo')
    await syncImportedPhotos(inserted.id, input.photos)
    await submitListingForReview(inserted.id, loadEnv().APP_URL)
    result = { action: 'create', listingId: inserted.id }
  }

  await recordImportRun(feed.id, input.externalId, result)
  return result
}

/** Auditní stopa běhu importu — job + položka, ať je v adminu vidět historie. */
async function recordImportRun(
  feedId: string,
  externalId: string,
  result: ImportResult,
): Promise<void> {
  const db = getDb()
  const now = new Date()
  const [job] = await db
    .insert(importJobs)
    .values({ feedId, status: 'done', startedAt: now, finishedAt: now, stats: { items: 1 } })
    .returning({ id: importJobs.id })
  if (!job) return
  await db.insert(importJobItems).values({
    jobId: job.id,
    externalId,
    listingId: result.listingId,
    action: result.action,
    status: 'ok',
  })
  await db.update(importFeeds).set({ lastRunAt: now }).where(eq(importFeeds.id, feedId))
}
