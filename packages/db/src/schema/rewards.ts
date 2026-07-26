import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { createdAt, uuidPrimaryKey } from './helpers'
import { listingMedia, listings } from './listings'

export const rewardPayoutStatusEnum = pgEnum('reward_payout_status', [
  'detected',
  'approved',
  'paid',
  'rejected',
])

/**
 * Odměna za inzerát s platebním QR kódem ve fotkách. Detekci dělá worker,
 * schválení i samotnou platbu (QR v bankovní aplikaci) vždy admin — aplikace
 * peníze nikdy neodesílá sama.
 */
export const rewardPayouts = pgTable(
  'reward_payouts',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    mediaId: uuid().references(() => listingMedia.id, { onDelete: 'set null' }),
    iban: text().notNull(),
    bic: text(),
    amountCzk: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    spaydRaw: text().notNull(),
    status: rewardPayoutStatusEnum().notNull().default('detected'),
    approvedByUserId: text().references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    note: text(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('reward_payouts_listing_unique').on(table.listingId),
    index().on(table.status),
    index().on(table.iban),
  ],
)
