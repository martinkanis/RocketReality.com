import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { users } from './auth'
import { messageStatusEnum, savedSearchFrequencyEnum } from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'
import { listings } from './listings'

export const favorites = pgTable(
  'favorites',
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    note: text(),
    /** Cena v momentě uložení — pro indikaci „zlevněno od uložení". */
    priceAtSave: text(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index().on(table.listingId),
  ],
)

/** Uložené hledání = hlídací pes. Filters ve stejném tvaru jako SearchQuery DTO. */
export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuidPrimaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    filters: jsonb().notNull(),
    frequency: savedSearchFrequencyEnum().notNull().default('denne'),
    isActive: boolean().notNull().default(true),
    lastNotifiedAt: timestamp({ withTimezone: true }),
    /** Kurzor: publishedAt posledního inzerátu, který uživatel už dostal. */
    lastSeenPublishedAt: timestamp({ withTimezone: true }),
    unsubscribeToken: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.userId),
    index('saved_searches_scheduler')
      .on(table.frequency, table.lastNotifiedAt)
      .where(sql`${table.isActive}`),
  ],
)

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    senderUserId: text().references(() => users.id, { onDelete: 'set null' }),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    message: text().notNull(),
    status: messageStatusEnum().notNull().default('new'),
    ip: inet(),
    userAgent: text(),
    honeypotTriggered: boolean().notNull().default(false),
    spamScore: smallint().notNull().default(0),
    consentAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.listingId, table.createdAt),
    index('contact_messages_rate_limit').on(table.ip, table.createdAt),
    check('contact_messages_spam_score', sql`${table.spamScore} BETWEEN 0 AND 100`),
  ],
)

/**
 * Zobrazení detailu inzerátu nebo profilu kanceláře — pro statistiky
 * majitelů (kolik lidí přišlo, jak dlouho tam byli). Právě jedno z
 * listingId/agencyId je vždy vyplněné. durationSeconds se dopočítá
 * až při odchodu ze stránky (sendBeacon), do té doby je null.
 */
export const pageViews = pgTable(
  'page_views',
  {
    id: uuidPrimaryKey(),
    listingId: uuid().references(() => listings.id, { onDelete: 'cascade' }),
    agencyId: uuid().references(() => agencies.id, { onDelete: 'cascade' }),
    durationSeconds: integer(),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.listingId, table.createdAt),
    index().on(table.agencyId, table.createdAt),
    check(
      'page_views_exactly_one_entity',
      sql`(${table.listingId} IS NOT NULL)::int + (${table.agencyId} IS NOT NULL)::int = 1`,
    ),
  ],
)
