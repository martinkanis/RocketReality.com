import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
    /** Číselné id klienta pro XML-RPC rozhraní — jím začíná relace metodou getHash. */
    clientId: integer().unique(),
    /** md5(heslo k importu); výpočet session_id předepsaný protokolem pracuje s hashem. */
    importPasswordMd5: text(),
    /** Klíč exportního softwaru kanceláře — vstupuje do výpočtu session_id. */
    softwareKey: text(),
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
