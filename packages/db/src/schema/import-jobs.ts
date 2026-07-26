import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { importJobStatusEnum } from './enums'
import { createdAt, uuidPrimaryKey } from './helpers'
import { importFeeds } from './import-feeds'
import { listings } from './listings'

export const importActionEnum = pgEnum('import_action', ['create', 'update', 'archive', 'skip'])
export const importItemStatusEnum = pgEnum('import_item_status', ['ok', 'error'])

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuidPrimaryKey(),
    feedId: uuid()
      .notNull()
      .references(() => importFeeds.id, { onDelete: 'cascade' }),
    status: importJobStatusEnum().notNull().default('pending'),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    stats: jsonb(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.feedId, table.createdAt)],
)

export const importJobItems = pgTable(
  'import_job_items',
  {
    id: uuidPrimaryKey(),
    jobId: uuid()
      .notNull()
      .references(() => importJobs.id, { onDelete: 'cascade' }),
    externalId: text().notNull(),
    listingId: uuid().references(() => listings.id, { onDelete: 'set null' }),
    action: importActionEnum().notNull(),
    status: importItemStatusEnum().notNull(),
    errors: jsonb(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.jobId)],
)
