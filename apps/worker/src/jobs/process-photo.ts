import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { loadEnv } from '@rocket/config'
import { getDb, listingMedia } from '@rocket/db'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export interface ProcessPhotoPayload {
  mediaId: string
}

const WEBP_QUALITY = 80

interface VariantSpec {
  width: number
  height: number
  fit: 'cover' | 'inside'
}

const VARIANT_SPECS = {
  thumb: { width: 360, height: 240, fit: 'cover' },
  card: { width: 640, height: 430, fit: 'cover' },
  detail: { width: 1600, height: 1200, fit: 'inside' },
} as const satisfies Record<string, VariantSpec>

type VariantName = keyof typeof VARIANT_SPECS

const logger = createLogger('media.process')

let cachedS3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client
  const env = loadEnv()
  cachedS3Client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
  return cachedS3Client
}

async function downloadOriginal(storageKey: string): Promise<Buffer> {
  const { S3_BUCKET } = loadEnv()
  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: storageKey }),
  )
  if (!result.Body) {
    throw new Error(`Originál fotky ${storageKey} nemá v S3 žádný obsah`)
  }
  return Buffer.from(await result.Body.transformToByteArray())
}

/** Vytvoří webp derivát dané velikosti, nahraje ho do S3 a vrátí jeho klíč. */
async function createVariant(
  storageKey: string,
  original: Buffer,
  variantName: VariantName,
): Promise<string> {
  const spec = VARIANT_SPECS[variantName]
  const derived = await sharp(original)
    .resize(spec.width, spec.height, { fit: spec.fit })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const variantKey = `${storageKey}-${variantName}.webp`
  const { S3_BUCKET } = loadEnv()
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: variantKey,
      Body: derived,
      ContentType: 'image/webp',
    }),
  )
  return variantKey
}

/** Zpracování nahrané fotky inzerátu: stáhne originál a vytvoří webp deriváty. */
export const processPhotoJob = defineJob<ProcessPhotoPayload>({
  name: 'media.process',
  handler: async ({ mediaId }) => {
    const db = getDb()
    const [media] = await db
      .select()
      .from(listingMedia)
      .where(eq(listingMedia.id, mediaId))
      .limit(1)
    if (!media) {
      throw new Error(`Záznam listing_media ${mediaId} neexistuje`)
    }

    const original = await downloadOriginal(media.storageKey)
    const metadata = await sharp(original).metadata()

    const variants = {
      thumb: await createVariant(media.storageKey, original, 'thumb'),
      card: await createVariant(media.storageKey, original, 'card'),
      detail: await createVariant(media.storageKey, original, 'detail'),
    }

    await db
      .update(listingMedia)
      .set({
        variants,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        isReady: true,
      })
      .where(eq(listingMedia.id, mediaId))

    logger.info({ mediaId, variants }, 'Deriváty fotky vytvořeny')
  },
})
