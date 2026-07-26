import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { moderationReasonEnum, moderationStatusEnum } from './enums'
import { createdAt, uuidPrimaryKey } from './helpers'
import { listings } from './listings'

export const moderationCases = pgTable(
  'moderation_cases',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    status: moderationStatusEnum().notNull().default('pending'),
    reasonCode: moderationReasonEnum(),
    note: text(),
    moderatorUserId: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    resolvedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index('moderation_cases_queue').on(table.createdAt).where(sql`${table.status} = 'pending'`),
    index().on(table.listingId),
  ],
)
