'use server'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadEnv } from '@rocket/config'
import { ListingStateError, submitListingForReview } from '@rocket/core'
import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { subcategoriesOf } from '@rocket/shared'
import { and, count, eq, isNull, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { getAgencyMembership } from '@/lib/session'
import { requireUser } from '@/lib/require-user'
import {
  ALLOWED_PHOTO_MIMES,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE_BYTES,
  type CreateUploadUrlResult,
  type DraftPayload,
  type PhotoActionResult,
  type RegisterPhotoResult,
  type SaveDraftResult,
  type SubmitListingResult,
} from './types'
import { draftPayloadSchema, validateListingForSubmit, type ParsedDraftPayload } from './validation'

const logger = createLogger('wizard')

const PRESIGNED_URL_EXPIRATION_SECONDS = 600

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    const env = loadEnv()
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // Garage (úložiště Rock8) očekává bucket v adrese serveru, ne v cestě.
      // S path-style adresováním požadavek minul S3 API, vrátil se HTML 404
      // a knihovna ho ohlásila jako nesrozumitelnou chybu parsování XML.
      forcePathStyle: false,
    })
  }
  return s3Client
}

function parseListingId(listingId: string): string {
  const parsed = z.uuid().safeParse(listingId)
  if (!parsed.success) throw new Error('Neplatné ID inzerátu')
  return parsed.data
}

/** Načte inzerát a ověří, že patří uživateli a je stále editovatelný (koncept/zamítnutý). */
async function requireOwnedEditableListing(listingId: string, userId: string) {
  const db = getDb()
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1)
  if (!listing || listing.ownerUserId !== userId) {
    throw new Error('Inzerát neexistuje nebo vám nepatří')
  }
  if (listing.status !== 'draft' && listing.status !== 'rejected') {
    throw new Error(`Inzerát ve stavu '${listing.status}' nelze upravovat`)
  }
  return listing
}

interface ResolvedLocation {
  municipalityId: number
  districtId: number
  kraj: (typeof districts.$inferSelect)['kraj']
  locationPoint: { x: number; y: number }
}

/** GPS, okres a kraj se odvozují server-side z centroidu zvolené obce. */
async function resolveLocation(municipalityId: number): Promise<ResolvedLocation> {
  const db = getDb()
  const [row] = await db
    .select({
      districtId: municipalities.districtId,
      centroid: municipalities.centroid,
      kraj: districts.kraj,
    })
    .from(municipalities)
    .innerJoin(districts, eq(municipalities.districtId, districts.id))
    .where(eq(municipalities.id, municipalityId))
    .limit(1)
  if (!row) throw new Error(`Obec s ID ${municipalityId} neexistuje`)
  if (!row.centroid) throw new Error(`Obec s ID ${municipalityId} nemá souřadnice`)
  return {
    municipalityId,
    districtId: row.districtId,
    kraj: row.kraj,
    locationPoint: { x: row.centroid.x, y: row.centroid.y },
  }
}

/** Payload → hodnoty sloupců listings (bez lokality a vlastníka). */
function buildDraftValues(data: ParsedDraftPayload) {
  const validSubIds = subcategoriesOf(data.categoryMainId).map((sub) => sub.id)
  return {
    transaction: data.transaction,
    categoryMainId: data.categoryMainId,
    categorySubId:
      data.categorySubId !== null && validSubIds.includes(data.categorySubId)
        ? data.categorySubId
        : null,
    disposition: data.disposition,
    title: data.title,
    description: data.description,
    priceAmount: data.priceAmount,
    priceUnit: data.transaction === 'pronajem' ? ('za_mesic' as const) : ('celkem' as const),
    priceNote: data.priceNote,
    priceHidden: data.priceHidden,
    monthlyFees: data.monthlyFees,
    deposit: data.deposit,
    areaUsable: data.areaUsable,
    areaBuiltUp: data.areaBuiltUp,
    areaLand: data.areaLand,
    areaGarden: data.areaGarden,
    floorNumber: data.floorNumber,
    floorsTotal: data.floorsTotal,
    ownership: data.ownership,
    buildingType: data.buildingType,
    buildingCondition: data.buildingCondition,
    furnishing: data.furnishing,
    energyLabel: data.energyLabel,
    hasBalcony: data.hasBalcony,
    balconyArea: data.balconyArea,
    hasTerrace: data.hasTerrace,
    terraceArea: data.terraceArea,
    hasLoggia: data.hasLoggia,
    loggiaArea: data.loggiaArea,
    hasCellar: data.hasCellar,
    cellarArea: data.cellarArea,
    hasElevator: data.hasElevator,
    hasGarage: data.hasGarage,
    hasParking: data.hasParking,
    barrierFree: data.barrierFree,
    availableFrom: data.availableFrom,
    attributes: data.utilities ?? {},
    street: data.street,
    streetNumber: data.streetNumber,
    addressVisibility: data.addressVisibility,
  }
}

/**
 * Autosave konceptu — první uložení s vybranou obcí koncept založí (INSERT),
 * další volání ho aktualizují. Bez obce zatím není co ukládat (chybí NOT NULL lokalita).
 */
export async function saveDraft(
  listingId: string | null,
  payload: DraftPayload,
): Promise<SaveDraftResult> {
  const user = await requireUser()
  const parsed = draftPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    logger.warn({ userId: user.id, issues: parsed.error.issues }, 'Nevalidní payload konceptu')
    return { ok: false, error: 'Formulář obsahuje neplatné hodnoty, zkontrolujte zadání.' }
  }
  const data = parsed.data
  const db = getDb()
  const values = buildDraftValues(data)

  if (listingId) {
    const id = parseListingId(listingId)
    await requireOwnedEditableListing(id, user.id)
    const location = data.municipalityId ? await resolveLocation(data.municipalityId) : null
    await db
      .update(listings)
      .set({ ...values, ...(location ?? {}) })
      .where(eq(listings.id, id))
    return { ok: true, listingId: id }
  }

  if (!data.municipalityId) return { ok: true, listingId: null }

  const location = await resolveLocation(data.municipalityId)
  const membership = await getAgencyMembership(user.id)
  const [inserted] = await db
    .insert(listings)
    .values({
      ...values,
      ...location,
      ownerUserId: user.id,
      agencyId: membership?.agencyId ?? null,
      slug: `tmp-${crypto.randomUUID()}`,
      status: 'draft',
    })
    .returning({ id: listings.id })
  if (!inserted) throw new Error('Vložení konceptu do databáze selhalo')
  return { ok: true, listingId: inserted.id }
}

/** Vystaví presigned PUT URL pro přímý upload fotky do S3/MinIO. */
export async function createUploadUrl(
  listingId: string,
  fileName: string,
  mime: string,
): Promise<CreateUploadUrlResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedEditableListing(id, user.id)

  const extension = EXTENSION_BY_MIME[mime]
  if (!extension) {
    return { ok: false, error: 'Nepodporovaný formát souboru (povolené: JPEG, PNG, WebP)' }
  }

  const db = getDb()
  const [photoCount] = await db
    .select({ total: count() })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, id), eq(listingMedia.kind, 'foto')))
  if ((photoCount?.total ?? 0) >= MAX_PHOTOS) {
    return { ok: false, error: `Inzerát může mít nejvýše ${MAX_PHOTOS} fotografií` }
  }

  const env = loadEnv()
  const storageKey = `listings/${id}/${crypto.randomUUID()}.${extension}`
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: storageKey,
    ContentType: mime,
  })
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS,
  })
  logger.debug({ listingId: id, fileName, storageKey }, 'Vystavena upload URL pro fotku')
  return { ok: true, uploadUrl, storageKey }
}

/** Po úspěšném PUT uploadu zaeviduje fotku — deriváty (thumb/card/detail) dodělá worker. */
export async function registerPhoto(
  listingId: string,
  storageKey: string,
  mime: string,
  fileSize: number,
): Promise<RegisterPhotoResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedEditableListing(id, user.id)

  if (!storageKey.startsWith(`listings/${id}/`)) {
    return { ok: false, error: 'Neplatný klíč souboru' }
  }
  if (!(ALLOWED_PHOTO_MIMES as readonly string[]).includes(mime)) {
    return { ok: false, error: 'Nepodporovaný formát souboru' }
  }
  if (fileSize <= 0 || fileSize > MAX_PHOTO_SIZE_BYTES) {
    return { ok: false, error: 'Soubor je příliš velký (limit 10 MB)' }
  }

  const db = getDb()
  const [maxRow] = await db
    .select({ maxPosition: max(listingMedia.position) })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, id), eq(listingMedia.kind, 'foto')))
  const position = (maxRow?.maxPosition ?? -1) + 1

  const [inserted] = await db
    .insert(listingMedia)
    .values({ listingId: id, kind: 'foto', position, storageKey, mime, fileSize, isReady: false })
    .returning({ id: listingMedia.id })
  if (!inserted) throw new Error('Uložení fotografie do databáze selhalo')
  return { ok: true, photo: { id: inserted.id, storageKey, position } }
}

/** Smaže fotku z databáze — úklid v S3 řeší samostatný proces, ne wizard. */
export async function deletePhoto(listingId: string, mediaId: string): Promise<PhotoActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedEditableListing(id, user.id)
  await getDb()
    .delete(listingMedia)
    .where(and(eq(listingMedia.id, parseListingId(mediaId)), eq(listingMedia.listingId, id)))
  return { ok: true }
}

/** Uloží nové pořadí fotek podle pole ID (index = position). */
export async function updatePhotoOrder(
  listingId: string,
  orderedMediaIds: string[],
): Promise<PhotoActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedEditableListing(id, user.id)
  const mediaIds = orderedMediaIds.map(parseListingId)

  const db = getDb()
  await db.transaction(async (tx) => {
    for (const [index, mediaId] of mediaIds.entries()) {
      await tx
        .update(listingMedia)
        .set({ position: index })
        .where(and(eq(listingMedia.id, mediaId), eq(listingMedia.listingId, id)))
    }
  })
  return { ok: true }
}

/**
 * Odeslání ke schválení: zvaliduje povinná pole podle kategorie a předá inzerát
 * doménové službě (objednávka publikace + fronta moderace). Při úspěchu redirect.
 */
export async function submitListing(listingId: string): Promise<SubmitListingResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  const listing = await requireOwnedEditableListing(id, user.id)

  const errors = validateListingForSubmit(listing)
  if (errors.length > 0) return { ok: false, errors }

  try {
    await submitListingForReview(id, `${loadEnv().APP_URL}/muj-ucet/inzeraty`)
  } catch (error) {
    if (error instanceof ListingStateError) {
      logger.warn({ listingId: id, error: error.message }, 'Odeslání inzerátu ke schválení selhalo')
      return { ok: false, errors: [{ step: 6, message: error.message }] }
    }
    throw error
  }

  revalidatePath('/muj-ucet')
  revalidatePath('/muj-ucet/inzeraty')
  redirect('/muj-ucet/inzeraty?odeslano=1')
}
