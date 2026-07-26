import jsQR from 'jsqr'
import sharp from 'sharp'
import { REWARD_QR_AMOUNT_CZK } from '@rocket/config'
import { parseSpayd } from '@rocket/core'
import { getDb, rewardPayouts, type listingMedia } from '@rocket/db'
import { createLogger } from '../logger'

const QR_SCAN_MAX_WIDTH = 1200

const logger = createLogger('media.qr')

type MediaRow = typeof listingMedia.$inferSelect

/**
 * Detekce platebního QR (SPAYD) ve fotce inzerátu. Nález se jen zaznamená
 * jako kandidát odměny — schválení a výplata je vždy na adminovi.
 */
export async function detectPaymentQr(media: MediaRow, original: Buffer): Promise<void> {
  const decoded = await decodeQr(original)
  if (!decoded) return

  const payment = parseSpayd(decoded)
  if (!payment) {
    logger.info({ mediaId: media.id }, 'QR kód nalezen, ale není to validní SPAYD platba')
    return
  }

  const db = getDb()
  await db
    .insert(rewardPayouts)
    .values({
      listingId: media.listingId,
      mediaId: media.id,
      iban: payment.iban,
      bic: payment.bic,
      amountCzk: REWARD_QR_AMOUNT_CZK,
      spaydRaw: payment.raw,
    })
    .onConflictDoNothing()

  logger.info(
    { mediaId: media.id, listingId: media.listingId, iban: payment.iban },
    'Detekován platební QR kód — kandidát na odměnu zaznamenán',
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
