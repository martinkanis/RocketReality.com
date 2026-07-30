import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createdAt, uuidPrimaryKey } from './helpers'
import { importFeeds } from './import-feeds'

/**
 * Relace importního XML-RPC rozhraní. Protokol mění session_id s každým
 * autorizovaným požadavkem, proto se drží poslední platná hodnota; klient
 * se dohledává podle neměnné fixní části.
 */
export const importSessions = pgTable(
  'import_sessions',
  {
    id: uuidPrimaryKey(),
    feedId: uuid()
      .notNull()
      .references(() => importFeeds.id, { onDelete: 'cascade' }),
    /** Prvních 48 znaků session_id — po celou relaci se nemění. */
    fixedPart: text().notNull().unique(),
    /** Naposledy platné session_id; další požadavek z něj musí být odvozen. */
    sessionId: text().notNull(),
    /** Relaci lze použít k importu až po úspěšném volání login. */
    isAuthorized: boolean().notNull().default(false),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.feedId), index().on(table.expiresAt)],
)
