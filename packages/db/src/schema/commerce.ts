import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { users } from './auth'
import {
  boostTypeEnum,
  currencyEnum,
  orderItemTypeEnum,
  orderStatusEnum,
  paymentProviderEnum,
  paymentStatusEnum,
} from './enums'
import { createdAt, updatedAt, uuidPrimaryKey } from './helpers'
import { listings } from './listings'

/** Ceník. V1: seed s cenou 0 (vše zdarma) — viz DEFAULT_PRODUCTS v @rocket/config. */
export const products = pgTable('products', {
  id: uuidPrimaryKey(),
  code: text().notNull().unique(),
  name: text().notNull(),
  price: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  currency: currencyEnum().notNull().default('CZK'),
  durationDays: smallint().notNull(),
  isActive: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const orders = pgTable(
  'orders',
  {
    id: uuidPrimaryKey(),
    number: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => users.id),
    agencyId: uuid().references(() => agencies.id),
    status: orderStatusEnum().notNull().default('created'),
    totalAmount: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull().default(0),
    currency: currencyEnum().notNull().default('CZK'),
    createdAt: createdAt(),
    paidAt: timestamp({ withTimezone: true }),
  },
  (table) => [index().on(table.userId, table.createdAt)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuidPrimaryKey(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: orderItemTypeEnum().notNull(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    listingId: uuid()
      .notNull()
      .references(() => listings.id),
    /** Snapshot ceny v okamžiku objednávky — ceník se může měnit. */
    unitPrice: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    quantity: integer().notNull().default(1),
    metadata: jsonb(),
  },
  (table) => [index().on(table.orderId), index().on(table.listingId)],
)

export const payments = pgTable(
  'payments',
  {
    id: uuidPrimaryKey(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    provider: paymentProviderEnum().notNull(),
    status: paymentStatusEnum().notNull().default('pending'),
    amount: numeric({ precision: 12, scale: 2, mode: 'number' }).notNull(),
    currency: currencyEnum().notNull().default('CZK'),
    idempotencyKey: text().notNull().unique(),
    stripePaymentIntentId: text().unique(),
    stripeCheckoutSessionId: text(),
    errorCode: text(),
    createdAt: createdAt(),
    confirmedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index().on(table.orderId)],
)

/** Idempotence Stripe webhooků — každý event zpracovat právě jednou. */
export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: uuidPrimaryKey(),
  stripeEventId: text().notNull().unique(),
  type: text().notNull(),
  payload: jsonb().notNull(),
  processedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
})

export const boosts = pgTable(
  'boosts',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    orderItemId: uuid().references(() => orderItems.id),
    type: boostTypeEnum().notNull().default('top'),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.listingId, table.endsAt)],
)
