import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { users } from './auth'
import { importFeedTypeEnum } from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'

/**
 * Importní kanál pro push inzerátů přes API (nebo XML feed ve V2).
 * Klíč si vytváří přihlášený uživatel sám — vlastníkem importovaných
 * inzerátů je createdByUserId, agencyId se doplní z jeho členství v RK.
 */
export const importFeeds = pgTable(
  'import_feeds',
  {
    id: uuidPrimaryKey(),
    agencyId: uuid().references(() => agencies.id, { onDelete: 'cascade' }),
    createdByUserId: text().references(() => users.id, { onDelete: 'cascade' }),
    label: text().notNull().default(''),
    type: importFeedTypeEnum().notNull(),
    apiKeyHash: text(),
    config: jsonb(),
    isActive: boolean().notNull().default(true),
    lastRunAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.agencyId),
    index().on(table.createdByUserId),
    index().on(table.apiKeyHash),
  ],
)
