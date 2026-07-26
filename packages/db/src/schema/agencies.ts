import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { agencyRoleEnum, agencyStatusEnum } from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'

export const agencies = pgTable(
  'agencies',
  {
    id: uuidPrimaryKey(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    ico: varchar({ length: 8 }).unique(),
    dic: varchar({ length: 12 }),
    aresData: jsonb(),
    aresSyncedAt: timestamp({ withTimezone: true }),
    logoKey: text(),
    description: text(),
    web: text(),
    email: text(),
    phone: text(),
    street: text(),
    city: text(),
    postalCode: varchar({ length: 5 }),
    gps: geometry({ type: 'point', mode: 'xy', srid: 4326 }),
    status: agencyStatusEnum().notNull().default('active'),
    ratingAvg: numeric({ precision: 2, scale: 1, mode: 'number' }),
    ratingCount: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check('agencies_ico_format', sql`${table.ico} IS NULL OR ${table.ico} ~ '^\\d{8}$'`)],
)

export const agencyMembers = pgTable(
  'agency_members',
  {
    agencyId: uuid()
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: agencyRoleEnum().notNull().default('makler'),
    isActive: boolean().notNull().default(true),
    invitedAt: timestamp({ withTimezone: true }),
    acceptedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.agencyId, table.userId] }), index().on(table.userId)],
)
