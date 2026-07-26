import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { loadEnv } from '@rocket/config'
import { PostgresListingSearch, parseSavedSearchFilters } from '@rocket/core'
import { getDb, savedSearches, users } from '@rocket/db'
import { sendWatchdogDigest, type WatchdogListingItem } from '@rocket/emails'
import { createLogger } from '../logger'
import { defineJob } from './define-job'

export const WATCHDOG_CRON = '*/15 * * * *'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const WEEK_IN_MS = 7 * DAY_IN_MS
const MAX_ITEMS_PER_DIGEST = 10

const logger = createLogger('watchdog.run')
const search = new PostgresListingSearch()

type SavedSearch = typeof savedSearches.$inferSelect

interface WatchdogMatches {
  items: WatchdogListingItem[]
  newestPublishedAt: Date | null
}

/**
 * Hlídací pes: projde uložená hledání, kterým náleží notifikace (okamžitá vždy,
 * denní po 24 h, týdenní po 7 dnech), najde nově publikované inzeráty odpovídající
 * filtrům a pošle e-mailový digest.
 */
export const watchdogJob = defineJob({
  name: 'watchdog.run',
  handler: async () => {
    const db = getDb()
    const dailyThreshold = new Date(Date.now() - DAY_IN_MS)
    const weeklyThreshold = new Date(Date.now() - WEEK_IN_MS)

    const dueSearches = await db
      .select({ search: savedSearches, userEmail: users.email, userName: users.name })
      .from(savedSearches)
      .innerJoin(users, eq(savedSearches.userId, users.id))
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
            and(
              eq(savedSearches.frequency, 'tydne'),
              or(
                isNull(savedSearches.lastNotifiedAt),
                lt(savedSearches.lastNotifiedAt, weeklyThreshold),
              ),
            ),
          ),
        ),
      )

    let sentCount = 0
    for (const { search: savedSearch, userEmail } of dueSearches) {
      const matches = await findNewListingsForSearch(savedSearch)
      if (matches.items.length > 0) {
        const appUrl = loadEnv().APP_URL
        try {
          await sendWatchdogDigest({
            to: userEmail,
            searchName: savedSearch.name,
            listings: matches.items,
            unsubscribeUrl: `${appUrl}/odhlasit-hlidaciho-psa?token=${savedSearch.unsubscribeToken}`,
          })
          sentCount += 1
        } catch (error) {
          logger.error({ err: error, savedSearchId: savedSearch.id }, 'Odeslání digestu selhalo')
          continue
        }
      }
      await db
        .update(savedSearches)
        .set({
          lastNotifiedAt: new Date(),
          lastSeenPublishedAt: matches.newestPublishedAt ?? savedSearch.lastSeenPublishedAt,
        })
        .where(eq(savedSearches.id, savedSearch.id))
    }

    logger.info({ processedCount: dueSearches.length, sentCount }, 'Průchod hlídacích psů dokončen')
  },
})

/** Najde inzeráty publikované po kurzoru uloženého hledání, které odpovídají filtrům. */
async function findNewListingsForSearch(savedSearch: SavedSearch): Promise<WatchdogMatches> {
  const query = parseSavedSearchFilters(savedSearch.filters)
  if (!query) {
    logger.warn({ savedSearchId: savedSearch.id }, 'Uložené hledání má nevalidní filtry')
    return { items: [], newestPublishedAt: null }
  }

  const result = await search.search({ ...query, sort: 'nejnovejsi', page: 1, pageSize: 30 })
  // Kurzor: bez něj nenotifikujeme historii, jen si zapamatujeme aktuální stav.
  const cursor = savedSearch.lastSeenPublishedAt
  const newestPublishedAt = result.items[0]?.publishedAt ?? null
  if (!cursor) {
    return { items: [], newestPublishedAt }
  }

  const appUrl = loadEnv().APP_URL
  const fresh = result.items.filter(
    (item) => item.publishedAt !== null && item.publishedAt > cursor,
  )
  const items: WatchdogListingItem[] = fresh.slice(0, MAX_ITEMS_PER_DIGEST).map((item) => ({
    title: item.title,
    price: {
      amount: item.priceAmount,
      currency: 'CZK',
      unit: item.priceUnit as WatchdogListingItem['price']['unit'],
      hidden: item.priceHidden,
    },
    locality: `${item.municipalityName}, okres ${item.districtName}`,
    url: `${appUrl}/detail/${item.slug}`,
  }))

  return { items, newestPublishedAt }
}
