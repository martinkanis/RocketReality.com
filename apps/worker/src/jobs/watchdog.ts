import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { getDb, savedSearches } from '@rocket/db'
import type { WatchdogListingItem } from '@rocket/emails'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export const WATCHDOG_CRON = '*/15 * * * *'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const logger = createLogger('watchdog.run')

type SavedSearch = typeof savedSearches.$inferSelect

/**
 * Hlídací pes: projde uložená hledání, kterým náleží notifikace — okamžitá vždy,
 * denní nejdřív 24 h po poslední notifikaci. Skutečný matching inzerátů dodá
 * další fáze, viz findNewListingsForSearch.
 */
export const watchdogJob = defineJob({
  name: 'watchdog.run',
  handler: async () => {
    const db = getDb()
    const dailyThreshold = new Date(Date.now() - DAY_IN_MS)

    const dueSearches = await db
      .select()
      .from(savedSearches)
      .where(
        and(
          eq(savedSearches.isActive, true),
          or(
            eq(savedSearches.frequency, 'okamzite'),
            and(
              eq(savedSearches.frequency, 'denne'),
              or(
                isNull(savedSearches.lastNotifiedAt),
                lt(savedSearches.lastNotifiedAt, dailyThreshold),
              ),
            ),
          ),
        ),
      )

    for (const search of dueSearches) {
      const matches = await findNewListingsForSearch(search)
      logger.info(
        { savedSearchId: search.id, matchCount: matches.length },
        'TODO: odeslat watchdog digest — matching inzerátů dodá další fáze',
      )
      await db
        .update(savedSearches)
        .set({ lastNotifiedAt: new Date() })
        .where(eq(savedSearches.id, search.id))
    }

    logger.info({ processedCount: dueSearches.length }, 'Průchod hlídacích psů dokončen')
  },
})

/**
 * TODO: dodat skutečný matching `search.filters` proti nově publikovaným inzerátům
 * (listings.publishedAt > search.lastSeenPublishedAt). Izolováno zde, aby další fáze
 * měnila jen tuto funkci.
 */
function findNewListingsForSearch(_search: SavedSearch): Promise<WatchdogListingItem[]> {
  return Promise.resolve([])
}
