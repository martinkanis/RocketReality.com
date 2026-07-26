import { and, eq, lt } from 'drizzle-orm'
import { getDb, listings } from '@rocket/db'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export const EXPIRE_LISTINGS_CRON = '0 3 * * *'

const logger = createLogger('listings.expire')

/** Denní úklid: aktivní inzeráty s prošlou platností označí jako expirované. */
export const expireListingsJob = defineJob({
  name: 'listings.expire',
  handler: async () => {
    const now = new Date()
    const expired = await getDb()
      .update(listings)
      .set({ status: 'expired', statusChangedAt: now })
      .where(and(eq(listings.status, 'active'), lt(listings.validUntil, now)))
      .returning({ id: listings.id })

    logger.info({ expiredCount: expired.length }, 'Expirace inzerátů dokončena')
  },
})
