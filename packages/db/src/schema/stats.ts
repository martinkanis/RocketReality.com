import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core'
import { listings } from './listings'

/** Denní agregace pro statistiky inzerenta — plněné UPSERT inkrementy. */
export const listingStatsDaily = pgTable(
  'listing_stats_daily',
  {
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    statDate: date().notNull(),
    views: integer().notNull().default(0),
    detailViews: integer().notNull().default(0),
    phoneReveals: integer().notNull().default(0),
    messages: integer().notNull().default(0),
    favoritesAdded: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.statDate] })],
)
