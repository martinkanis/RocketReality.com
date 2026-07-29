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
import {
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  CATEGORY_BYTY_ID,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_TYPES,
  ORIENTATIONS,
  OWNERSHIP_TYPES,
  PRICE_UNITS,
} from '@rocket/shared'
import type { Disposition, TransactionType } from '@rocket/shared'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { submitListingForReview } from '../listings/service'

const MAX_IMPORT_PHOTOS = 20

/** Nepovinné parametry nemovitosti. Nevyplněné se do inzerátu nepropíšou. */
const importAttributesSchema = z.object({
  ownership: z.enum(OWNERSHIP_TYPES).nullish(),
  buildingType: z.enum(BUILDING_TYPES).nullish(),
  buildingCondition: z.enum(BUILDING_CONDITIONS).nullish(),
  furnishing: z.enum(FURNISHING_TYPES).nullish(),
  energyLabel: z.enum(ENERGY_LABELS).nullish(),
  priceUnit: z.enum(PRICE_UNITS).nullish(),
  floorNumber: z.number().int().min(-5).max(200).nullish(),
  floorsTotal: z.number().int().min(1).max(200).nullish(),
  builtUpArea: z.number().positive().nullish(),
  gardenArea: z.number().positive().nullish(),
  monthlyFees: z.number().nonnegative().nullish(),
  deposit: z.number().nonnegative().nullish(),
  availableFrom: z.string().max(40).nullish(),
  orientation: z.array(z.enum(ORIENTATIONS)).max(8).nullish(),
  hasBalcony: z.boolean().nullish(),
  balconyArea: z.number().positive().nullish(),
  hasTerrace: z.boolean().nullish(),
  terraceArea: z.number().positive().nullish(),
  hasLoggia: z.boolean().nullish(),
  loggiaArea: z.number().positive().nullish(),
  hasCellar: z.boolean().nullish(),
  cellarArea: z.number().positive().nullish(),
  hasElevator: z.boolean().nullish(),
  hasGarage: z.boolean().nullish(),
  garageCount: z.number().int().min(0).max(50).nullish(),
  hasParking: z.boolean().nullish(),
  parkingCount: z.number().int().min(0).max(200).nullish(),
  barrierFree: z.boolean().nullish(),
  videoUrl: z.url().nullish(),
  virtualTourUrl: z.url().nullish(),
})

/** Kontrakt POST /api/import/inzeraty — musí odpovídat stránce /api-dokumentace. */
export const importListingSchema = z.object({
  externalId: z.string().min(1).max(200),
  title: z.string().min(5).max(200),
  sourceUrl: z.url().optional(),
  description: z.string().max(20_000).nullish(),
  offerType: z.enum(['sale', 'rent', 'other']),
  propertyType: z.string().max(100).nullish(),
  disposition: z.enum(DISPOSITIONS).nullish(),
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
  attributes: importAttributesSchema.optional(),
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
type ImportAttributes = z.infer<typeof importAttributesSchema>

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
 * Dispozice bytu — explicitní z požadavku, jinak z názvu („Prodej bytu 2+1 …").
 * Delší varianty se zkouší první, aby „3+kk" nepřebilo „3+1".
 */
function resolveDisposition(input: ImportListingInput): Disposition | null {
  if (input.disposition) return input.disposition
  const haystack = input.title.toLowerCase().replaceAll(' ', '')
  return (
    [...DISPOSITIONS]
      .sort((a, b) => b.length - a.length)
      .find((candidate) => haystack.includes(candidate)) ?? null
  )
}

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
  const categoryMainId = CATEGORY_BY_PROPERTY_TYPE[categoryKey] ?? CATEGORY_OSTATNI
  const disposition = resolveDisposition(input)
  if (categoryMainId === CATEGORY_BYTY_ID && !disposition) {
    throw new ImportValidationError(
      'U bytu je potřeba dispozice — pošlete pole "disposition" (např. "2+1") nebo ji uveďte v názvu',
    )
  }
  const attributes = input.attributes ?? {}
  return {
    title: input.title,
    description: input.description ?? '',
    transaction: TRANSACTION_BY_OFFER_TYPE[input.offerType],
    categoryMainId,
    disposition,
    priceAmount: input.price ?? null,
    priceHidden: input.price == null,
    priceNote: input.priceNote ?? null,
    priceUnit:
      attributes.priceUnit ??
      (input.offerType === 'rent' ? ('za_mesic' as const) : ('celkem' as const)),
    areaUsable: input.size ?? null,
    street: input.location.street ?? null,
    municipalityId: resolved.municipalityId,
    districtId: resolved.districtId,
    kraj: resolved.kraj,
    locationPoint: { x: resolved.centroid!.x, y: resolved.centroid!.y },
    ...mapOptionalAttributes(attributes),
    attributes: {
      importAgent: input.agent ?? null,
      importSourceUrl: input.sourceUrl ?? null,
    },
  }
}

/**
 * Nepovinné parametry se propisují jen když dorazily — sloupce s NOT NULL
 * (příznaky vybavení, energetický štítek) si jinak nechají výchozí hodnotu
 * a opakovaný import bez parametrů nepřepíše to, co inzerent vyplnil ručně.
 */
function mapOptionalAttributes(attributes: ImportAttributes) {
  const values: Record<string, unknown> = {}
  const setIfPresent = (column: string, value: unknown) => {
    if (value !== undefined && value !== null) values[column] = value
  }

  setIfPresent('ownership', attributes.ownership)
  setIfPresent('buildingType', attributes.buildingType)
  setIfPresent('buildingCondition', attributes.buildingCondition)
  setIfPresent('furnishing', attributes.furnishing)
  setIfPresent('energyLabel', attributes.energyLabel)
  setIfPresent('floorNumber', attributes.floorNumber)
  setIfPresent('floorsTotal', attributes.floorsTotal)
  setIfPresent('areaBuiltUp', attributes.builtUpArea)
  setIfPresent('areaGarden', attributes.gardenArea)
  setIfPresent('monthlyFees', attributes.monthlyFees)
  setIfPresent('deposit', attributes.deposit)
  setIfPresent('availableFrom', normalizeDateOnly(attributes.availableFrom))
  setIfPresent('orientation', attributes.orientation)
  setIfPresent('hasBalcony', attributes.hasBalcony)
  setIfPresent('balconyArea', attributes.balconyArea)
  setIfPresent('hasTerrace', attributes.hasTerrace)
  setIfPresent('terraceArea', attributes.terraceArea)
  setIfPresent('hasLoggia', attributes.hasLoggia)
  setIfPresent('loggiaArea', attributes.loggiaArea)
  setIfPresent('hasCellar', attributes.hasCellar)
  setIfPresent('cellarArea', attributes.cellarArea)
  setIfPresent('hasElevator', attributes.hasElevator)
  setIfPresent('hasGarage', attributes.hasGarage)
  setIfPresent('garageCount', attributes.garageCount)
  setIfPresent('hasParking', attributes.hasParking)
  setIfPresent('parkingCount', attributes.parkingCount)
  setIfPresent('barrierFree', attributes.barrierFree)
  setIfPresent('videoUrl', attributes.videoUrl)
  setIfPresent('virtualTourUrl', attributes.virtualTourUrl)

  return values
}

/** Sloupec availableFrom je typu date — z ISO data i data s časem vezme jen datum. */
function normalizeDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
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
 * existujícího jen propíše pole a stav nemění — s výjimkou smazaného inzerátu
 * (např. po omylem kliknutém "Smazat" v administraci), který se opětovným
 * importem vrátí zpět jako koncept a projde moderací znovu.
 */
export async function importListing(
  feed: ImportFeedIdentity,
  input: ImportListingInput,
): Promise<ImportResult> {
  const db = getDb()
  const resolved = await resolveMunicipality(input.location)
  const values = listingValuesFromInput(input, resolved)

  const [existing] = await db
    .select({ id: listings.id, status: listings.status, deletedAt: listings.deletedAt })
    .from(listings)
    .where(and(eq(listings.importFeedId, feed.id), eq(listings.externalId, input.externalId)))
    .limit(1)

  let result: ImportResult
  if (existing) {
    const isRevival = existing.deletedAt !== null
    await db
      .update(listings)
      .set(isRevival ? { ...values, deletedAt: null, status: 'draft' } : values)
      .where(eq(listings.id, existing.id))
    await syncImportedPhotos(existing.id, input.photos)
    if (isRevival || existing.status === 'draft' || existing.status === 'rejected') {
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
