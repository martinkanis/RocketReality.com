import { sql } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { savedSearches } from './engagement'
import { notificationChannelEnum, notificationStatusEnum, notificationTypeEnum } from './enums'
import { createdAt, uuidPrimaryKey } from './helpers'
import { listings } from './listings'

export const notifications = pgTable(
  'notifications',
  {
    id: uuidPrimaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum().notNull(),
    channel: notificationChannelEnum().notNull().default('email'),
    payload: jsonb().notNull().default({}),
    listingId: uuid().references(() => listings.id, { onDelete: 'set null' }),
    savedSearchId: uuid().references(() => savedSearches.id, { onDelete: 'set null' }),
    status: notificationStatusEnum().notNull().default('queued'),
    sentAt: timestamp({ withTimezone: true }),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.userId, table.createdAt),
    index('notifications_pending')
      .on(table.createdAt)
      .where(sql`${table.status} = 'queued'`),
  ],
)
