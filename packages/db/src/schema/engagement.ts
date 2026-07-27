import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  inet,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
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
