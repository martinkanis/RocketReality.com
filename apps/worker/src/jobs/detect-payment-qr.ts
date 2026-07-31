import jsQR from 'jsqr'
import sharp from 'sharp'
import { parseSpayd, recordRewardForPublishedListing } from '@rocket/core'
import { getDb, listingMedia } from '@rocket/db'
import { eq } from 'drizzle-orm'
import { createLogger } from '../logger'

const QR_SCAN_MAX_WIDTH = 1200

const logger = createLogger('media.qr')

type MediaRow = typeof listingMedia.$inferSelect

/**
 * Detekce platebního QR (SPAYD) ve fotce inzerátu. Nález se uloží k fotce;
 * nárok na odměnu z něj vzniká až zveřejněním inzerátu, takže se tady jen
 * zkusí založit pro případ, že inzerát už zveřejněný je.
 */
export async function detectPaymentQr(media: MediaRow, original: Buffer): Promise<void> {
  const decoded = await decodeQr(original)
  if (!decoded) return

  const payment = parseSpayd(decoded)
  if (!payment) {
    logger.info({ mediaId: media.id }, 'QR kód nalezen, ale není to validní SPAYD platba')
    return
  }

  await getDb()
    .update(listingMedia)
    .set({ paymentQrSpayd: payment.raw })
    .where(eq(listingMedia.id, media.id))

  const outcome = await recordRewardForPublishedListing(media.listingId)
  logger.info(
    { mediaId: media.id, listingId: media.listingId, iban: payment.iban, outcome },
    'Detekován platební QR kód',
  )
}

async function decodeQr(original: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(original)
      .resize(QR_SCAN_MAX_WIDTH, QR_SCAN_MAX_WIDTH, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const result = jsQR(new Uint8ClampedArray(data), info.width, info.height)
    return result?.data ?? null
  } catch (error) {
    logger.warn({ err: error }, 'Dekódování QR z fotky selhalo')
    return null
  }
}
