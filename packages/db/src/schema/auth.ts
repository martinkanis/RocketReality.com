import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { accountTypeEnum } from './enums'
import { citext, createdAt, updatedAt } from './helpers'

/**
 * Auth tabulky vlastní better-auth (textová ID generuje knihovna).
 * Doplněná doménová pole: accountType, phone. Pole role/banned patří admin pluginu.
 */

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: citext().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  phone: text(),
  accountType: accountTypeEnum().notNull().default('soukromnik'),
  /** Účet pro výplatu odměny z launch akce; alternativa k platebnímu QR ve fotce. */
  payoutIban: text(),
  role: text().notNull().default('user'),
  banned: boolean().notNull().default(false),
  banReason: text(),
  banExpires: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    impersonatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId), index().on(table.expiresAt)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.identifier)],
)
