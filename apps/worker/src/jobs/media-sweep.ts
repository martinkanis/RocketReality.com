import { and, eq, isNull, lt } from 'drizzle-orm'
import { getDb, listingMedia } from '@rocket/db'
import { createLogger } from '../logger'
import { defineJob } from './define-job'
import { processMedia } from './process-photo'

export const MEDIA_SWEEP_CRON = '* * * * *'

const SWEEP_BATCH_SIZE = 10
const MIN_AGE_MS = 30 * 1000

const logger = createLogger('media.sweep')

/**
 * Záchytná síť: web po uploadu jen vloží řádek media (isReady=false) a nezařazuje
 * job — sweep každou minutu dozpracuje vše, co čeká na deriváty.
 */
export const mediaSweepJob = defineJob({
  name: 'media.sweep',
  handler: async () => {
    const db = getDb()
    const pending = await db
      .select({ id: listingMedia.id })
      .from(listingMedia)
      .where(
        and(
          eq(listingMedia.isReady, false),
          eq(listingMedia.kind, 'foto'),
          // Importované fotky (sourceUrl) stahuje a zpracovává import-media-sweep.
          isNull(listingMedia.sourceUrl),
          lt(listingMedia.createdAt, new Date(Date.now() - MIN_AGE_MS)),
        ),
      )
      .limit(SWEEP_BATCH_SIZE)

    for (const media of pending) {
      try {
        await processMedia(media.id)
      } catch (error) {
        logger.error({ err: error, mediaId: media.id }, 'Zpracování fotky selhalo')
      }
    }

    if (pending.length > 0) {
      logger.info({ count: pending.length }, 'Sweep fotek dokončen')
    }
  },
})
