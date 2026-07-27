import { PutObjectCommand } from '@aws-sdk/client-s3'
import { and, eq, isNotNull, lt } from 'drizzle-orm'
import { loadEnv } from '@rocket/config'
import { getDb, listingMedia } from '@rocket/db'
import { createLogger } from '../logger'
import { defineJob } from './define-job'
import { getS3Client, processMedia } from './process-photo'

export const IMPORT_MEDIA_SWEEP_CRON = '* * * * *'

const SWEEP_BATCH_SIZE = 5
const MIN_AGE_MS = 10 * 1000
const DOWNLOAD_TIMEOUT_MS = 30_000
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const logger = createLogger('media.import')

/**
 * Stáhne originál fotky z externí URL (importní API) a uloží do S3, odkud ji
 * převezme standardní zpracování variant. Stahujeme jen http(s) obrázky
 * povolených typů do 15 MB — URL pochází od držitele API klíče, ne od
 * anonymního uživatele, hlubší SSRF ochrana (blokace privátních IP) je TODO.
 */
async function downloadToStorage(mediaId: string): Promise<void> {
  const db = getDb()
  const [media] = await db
    .select({
      id: listingMedia.id,
      storageKey: listingMedia.storageKey,
      sourceUrl: listingMedia.sourceUrl,
    })
    .from(listingMedia)
    .where(eq(listingMedia.id, mediaId))
    .limit(1)
  if (!media?.sourceUrl) return

  const url = new URL(media.sourceUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Nepodporovaný protokol zdrojové URL: ${url.protocol}`)
  }

  const response = await fetch(media.sourceUrl, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!response.ok) {
    throw new Error(`Stažení fotky selhalo: HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`Nepodporovaný typ obsahu: ${contentType || 'neznámý'}`)
  }
  const body = Buffer.from(await response.arrayBuffer())
  if (body.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error(`Fotka je příliš velká (${body.byteLength} B)`)
  }

  const env = loadEnv()
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: media.storageKey,
      Body: body,
      ContentType: contentType,
    }),
  )
  await db
    .update(listingMedia)
    .set({ mime: contentType, fileSize: body.byteLength })
    .where(eq(listingMedia.id, media.id))
}

/** Cron: stáhne čekající importované fotky a rovnou z nich vyrobí varianty. */
export const importMediaSweepJob = defineJob({
  name: 'media.import-sweep',
  handler: async () => {
    const db = getDb()
    const pending = await db
      .select({ id: listingMedia.id })
      .from(listingMedia)
      .where(
        and(
          eq(listingMedia.isReady, false),
          eq(listingMedia.kind, 'foto'),
          isNotNull(listingMedia.sourceUrl),
          lt(listingMedia.createdAt, new Date(Date.now() - MIN_AGE_MS)),
        ),
      )
      .limit(SWEEP_BATCH_SIZE)

    for (const media of pending) {
      try {
        await downloadToStorage(media.id)
        await processMedia(media.id)
      } catch (error) {
        logger.error({ err: error, mediaId: media.id }, 'Import fotky selhal')
      }
    }

    if (pending.length > 0) {
      logger.info({ count: pending.length }, 'Sweep importovaných fotek dokončen')
    }
  },
})
