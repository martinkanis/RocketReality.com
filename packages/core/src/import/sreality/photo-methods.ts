import { createHash, randomUUID } from 'node:crypto'
import { getDb, listingMedia, listings } from '@rocket/db'
import { and, desc, eq } from 'drizzle-orm'
import { RpcStatusError, STATUS, ok, type RpcResponse } from './rpc-status'
import type { XmlRpcValue } from './xml-rpc'

/**
 * Úložiště originálů fotek. Port drží balíček core nezávislý na S3 —
 * konkrétní implementaci dodává aplikace, která rozhraní vystavuje.
 */
export interface ImportPhotoStoragePort {
  upload(params: { storageKey: string; body: Buffer; contentType: string }): Promise<void>
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

/** Formáty, které protokol u fotek připouští; poznají se podle úvodních bajtů. */
const IMAGE_SIGNATURES: { mime: string; extension: string; magic: number[] }[] = [
  { mime: 'image/jpeg', extension: 'jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', extension: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', extension: 'gif', magic: [0x47, 0x49, 0x46, 0x38] },
]

function detectImageType(body: Buffer): { mime: string; extension: string } {
  const match = IMAGE_SIGNATURES.find((signature) =>
    signature.magic.every((byte, index) => body[index] === byte),
  )
  if (!match) {
    throw new RpcStatusError(STATUS.unsupportedImageFormat, 'Fotka není JPEG, PNG ani GIF')
  }
  return { mime: match.mime, extension: match.extension }
}

function readNumber(source: Record<string, XmlRpcValue>, key: string): number | undefined {
  const value = source[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    return Number.isInteger(parsed) ? parsed : undefined
  }
  if (typeof value === 'boolean') return value ? 1 : 0
  return undefined
}

function readText(source: Record<string, XmlRpcValue>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readImageBody(data: Record<string, XmlRpcValue>): Buffer {
  const body = data.data
  if (!Buffer.isBuffer(body) || body.byteLength === 0) {
    throw new RpcStatusError(STATUS.incompleteData, 'Chybí obrázek (data)')
  }
  if (body.byteLength > MAX_PHOTO_BYTES) {
    throw new RpcStatusError(STATUS.photoTooLarge, 'Fotka je příliš velká')
  }
  return body
}

/**
 * Pořadí fotky: hlavní fotka je první, ostatní jdou za ni. Pozice 0 je
 * vyhrazená hlavní fotce, protože z ní výpis bere náhled inzerátu.
 */
async function resolvePosition(
  listingId: string,
  data: Record<string, XmlRpcValue>,
): Promise<number> {
  if (readNumber(data, 'main') === 1) return 0

  const order = readNumber(data, 'order')
  if (order !== undefined && order > 0) return order

  const [last] = await getDb()
    .select({ position: listingMedia.position })
    .from(listingMedia)
    .where(eq(listingMedia.listingId, listingId))
    .orderBy(desc(listingMedia.position))
    .limit(1)
  return (last?.position ?? 0) + 1
}

/**
 * addPhoto — uloží originál a založí médium. Varianty (náhledy) dodělá
 * worker stejným sweepem jako u fotek nahraných přes web.
 */
export async function handleAddPhoto(
  listingId: string,
  data: Record<string, XmlRpcValue>,
  storage: ImportPhotoStoragePort,
): Promise<RpcResponse> {
  const body = readImageBody(data)
  const { mime, extension } = detectImageType(body)
  const contentHash = createHash('sha256').update(body).digest('hex')

  const db = getDb()
  const [duplicate] = await db
    .select({ seq: listingMedia.seq })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, listingId), eq(listingMedia.contentHash, contentHash)))
    .limit(1)
  if (duplicate) {
    throw new RpcStatusError(STATUS.duplicatePhoto, 'Fotka už je u inzerátu vložená')
  }

  const storageKey = `listings/${listingId}/${randomUUID()}.${extension}`
  await storage.upload({ storageKey, body, contentType: mime })

  const [inserted] = await db
    .insert(listingMedia)
    .values({
      listingId,
      kind: 'foto',
      position: await resolvePosition(listingId, data),
      storageKey,
      externalId: readText(data, 'photo_rkid'),
      contentHash,
      alt: readText(data, 'alt'),
      mime,
      fileSize: body.byteLength,
      isReady: false,
    })
    .returning({ seq: listingMedia.seq })

  if (!inserted) throw new Error('Uložení importované fotky selhalo')
  return ok({ photo_id: inserted.seq })
}

/** delPhoto — fotka se identifikuje číselným id nebo identifikátorem kanceláře. */
export async function handleDelPhoto(
  feedId: string,
  photoId: number,
  photoRkid: string,
): Promise<RpcResponse> {
  const db = getDb()
  const [photo] = await db
    .select({ id: listingMedia.id, feedId: listings.importFeedId })
    .from(listingMedia)
    .innerJoin(listings, eq(listingMedia.listingId, listings.id))
    .where(photoRkid ? eq(listingMedia.externalId, photoRkid) : eq(listingMedia.seq, photoId))
    .limit(1)

  // Neexistující fotka není chyba — protokol na opakované smazání vrací OK.
  if (!photo) return ok()
  if (photo.feedId !== feedId) {
    throw new RpcStatusError(STATUS.photoOfAnotherAdvert, 'Fotka patří k jinému inzerátu')
  }

  await db.delete(listingMedia).where(eq(listingMedia.id, photo.id))
  return ok()
}

/** listPhoto — přehled fotek inzerátu, aby si exportní software dopočítal rozdíly. */
export async function handleListPhoto(listingId: string): Promise<RpcResponse> {
  const rows = await getDb()
    .select({
      seq: listingMedia.seq,
      externalId: listingMedia.externalId,
      position: listingMedia.position,
    })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, listingId), eq(listingMedia.kind, 'foto')))
    .orderBy(listingMedia.position)

  return ok(
    rows.map((row) => ({
      photo_id: row.seq,
      photo_rkid: row.externalId ?? '',
      order: row.position,
      main: row.position === 0 ? 1 : 0,
    })),
  )
}
