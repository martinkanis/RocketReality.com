import { flagDuplicateForModeration } from '@rocket/core'
import { getDb, moderationCases } from '@rocket/db'
import { and, eq, gte, isNull } from 'drizzle-orm'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export const DUPLICATE_SCAN_CRON = '*/5 * * * *'

/**
 * Okno, ve kterém se čerstvé případy posuzují. Kdyby duplicita vznikla
 * později, zachytí ji kontrola toho novějšího inzerátu.
 */
const RECENT_CASE_WINDOW_MS = 30 * 60 * 1000

const SCAN_BATCH_SIZE = 50

const logger = createLogger('moderation.duplicates')

/**
 * Označí čekající moderační případy, u kterých to vypadá na tutéž nemovitost
 * nabízenou dvakrát. Běží mimo publikační cestu, aby výpadek kontroly nikdy
 * nezablokoval odeslání inzerátu ke schválení.
 */
export const duplicateScanJob = defineJob({
  name: 'moderation.duplicate-scan',
  handler: async () => {
    const db = getDb()
    const pending = await db
      .select({ id: moderationCases.id, listingId: moderationCases.listingId })
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.status, 'pending'),
          isNull(moderationCases.reasonCode),
          gte(moderationCases.createdAt, new Date(Date.now() - RECENT_CASE_WINDOW_MS)),
        ),
      )
      .limit(SCAN_BATCH_SIZE)

    let flagged = 0
    for (const moderationCase of pending) {
      try {
        const match = await flagDuplicateForModeration(moderationCase.listingId)
        if (match) {
          flagged++
          logger.info(
            {
              listingId: moderationCase.listingId,
              duplicateOf: match.listingId,
              reason: match.reason,
            },
            'Inzerát označen jako možná duplicita',
          )
        }
      } catch (error) {
        logger.error(
          { err: error, listingId: moderationCase.listingId },
          'Kontrola duplicity selhala',
        )
      }
    }

    if (pending.length > 0) {
      logger.info({ checked: pending.length, flagged }, 'Kontrola duplicit dokončena')
    }
  },
})
