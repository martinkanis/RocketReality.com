import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { users } from './auth'
import { moderationReasonEnum, reviewStatusEnum } from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'

export const agencyReviews = pgTable(
  'agency_reviews',
  {
    id: uuidPrimaryKey(),
    agencyId: uuid()
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    authorUserId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: smallint().notNull(),
    text: text(),
    moderationStatus: reviewStatusEnum().notNull().default('pending'),
    moderationReason: moderationReasonEnum(),
    replyText: text(),
    repliedAt: timestamp({ withTimezone: true }),
    repliedByUserId: text().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('agency_reviews_author_unique').on(table.agencyId, table.authorUserId),
    index('agency_reviews_public')
      .on(table.agencyId)
      .where(sql`${table.moderationStatus} = 'approved'`),
    check('agency_reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
)
