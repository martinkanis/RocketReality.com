import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { importFeedTypeEnum } from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'

/** Importní kanál realitního SW jedné RK (API push / XML feed). Plné API ve V2. */
export const importFeeds = pgTable(
  'import_feeds',
  {
    id: uuidPrimaryKey(),
    agencyId: uuid()
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    type: importFeedTypeEnum().notNull(),
    apiKeyHash: text(),
    config: jsonb(),
    isActive: boolean().notNull().default(true),
    lastRunAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.agencyId)],
)
