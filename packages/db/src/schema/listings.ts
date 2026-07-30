import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { agencies } from './agencies'
import { users } from './auth'
import {
  addressVisibilityEnum,
  archiveReasonEnum,
  buildingConditionEnum,
  buildingTypeEnum,
  currencyEnum,
  dispositionEnum,
  energyLabelEnum,
  furnishingTypeEnum,
  krajEnum,
  listingSourceEnum,
  listingStatusEnum,
  mediaKindEnum,
  orientationEnum,
  ownershipTypeEnum,
  priceUnitEnum,
  transactionTypeEnum,
} from './enums'
import { createdAt, tsvector, updatedAt, uuidPrimaryKey } from './helpers'
import { importFeeds } from './import-feeds'
import { districts, municipalities } from './locations'
import { categoriesMain, categoriesSub } from './taxonomy'

export const listings = pgTable(
  'listings',
  {
    id: uuidPrimaryKey(),
    seq: bigint({ mode: 'number' }).notNull().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),

    ownerUserId: text()
      .notNull()
      .references(() => users.id),
    agencyId: uuid().references(() => agencies.id),

    transaction: transactionTypeEnum().notNull(),
    categoryMainId: smallint()
      .notNull()
      .references(() => categoriesMain.id),
    categorySubId: smallint().references(() => categoriesSub.id),
    disposition: dispositionEnum(),

    title: text().notNull(),
    description: text().notNull().default(''),
    videoUrl: text(),
    virtualTourUrl: text(),

    priceAmount: numeric({ precision: 14, scale: 2, mode: 'number' }),
    priceCurrency: currencyEnum().notNull().default('CZK'),
    priceUnit: priceUnitEnum().notNull().default('celkem'),
    priceNote: text(),
    priceHidden: boolean().notNull().default(false),
    monthlyFees: numeric({ precision: 12, scale: 2, mode: 'number' }),
    deposit: numeric({ precision: 12, scale: 2, mode: 'number' }),

    areaUsable: numeric({ precision: 10, scale: 2, mode: 'number' }),
    areaBuiltUp: numeric({ precision: 10, scale: 2, mode: 'number' }),
    areaLand: numeric({ precision: 10, scale: 2, mode: 'number' }),
    areaGarden: numeric({ precision: 10, scale: 2, mode: 'number' }),

    floorNumber: smallint(),
    floorsTotal: smallint(),
    ownership: ownershipTypeEnum(),
    buildingType: buildingTypeEnum(),
    buildingCondition: buildingConditionEnum(),
    furnishing: furnishingTypeEnum(),
    energyLabel: energyLabelEnum().notNull().default('G'),
    penb: jsonb(),

    hasBalcony: boolean().notNull().default(false),
    balconyArea: numeric({ precision: 6, scale: 2, mode: 'number' }),
    hasTerrace: boolean().notNull().default(false),
    terraceArea: numeric({ precision: 6, scale: 2, mode: 'number' }),
    hasLoggia: boolean().notNull().default(false),
    loggiaArea: numeric({ precision: 6, scale: 2, mode: 'number' }),
    hasCellar: boolean().notNull().default(false),
    cellarArea: numeric({ precision: 6, scale: 2, mode: 'number' }),
    hasElevator: boolean().notNull().default(false),
    hasGarage: boolean().notNull().default(false),
    garageCount: smallint(),
    hasParking: boolean().notNull().default(false),
    parkingCount: smallint(),
    barrierFree: boolean().notNull().default(false),
    orientation: orientationEnum().array(),
    availableFrom: date(),

    attributes: jsonb().notNull().default({}),

    kraj: krajEnum().notNull(),
    districtId: smallint()
      .notNull()
      .references(() => districts.id),
    municipalityId: integer()
      .notNull()
      .references(() => municipalities.id),
    municipalityPart: text(),
    street: text(),
    streetNumber: text(),
    postalCode: varchar({ length: 5 }),
    locationPoint: geometry({ type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    addressVisibility: addressVisibilityEnum().notNull().default('presna'),
    ruianAdmId: bigint({ mode: 'number' }),

    status: listingStatusEnum().notNull().default('draft'),
    statusChangedAt: timestamp({ withTimezone: true }),
    publishedAt: timestamp({ withTimezone: true }),
    validUntil: timestamp({ withTimezone: true }),
    archiveReason: archiveReasonEnum(),
    rejectedReason: text(),

    source: listingSourceEnum().notNull().default('manual'),
    importFeedId: uuid().references(() => importFeeds.id),
    externalId: text(),

    toppedUntil: timestamp({ withTimezone: true }),
    viewCount: integer().notNull().default(0),

    searchVector: tsvector().generatedAlwaysAs(
      (): ReturnType<typeof sql> =>
        sql`to_tsvector('simple', immutable_unaccent(coalesce(title, '') || ' ' || coalesce(description, '')))`,
    ),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex('listings_seq_unique').on(table.seq),
    uniqueIndex('listings_agency_external_unique')
      .on(table.agencyId, table.externalId)
      .where(sql`${table.externalId} IS NOT NULL`),
    index('listings_search_main')
      .on(table.transaction, table.categoryMainId, table.kraj, table.priceAmount)
      .where(sql`${table.status} = 'active'`),
    index('listings_search_disposition')
      .on(table.transaction, table.categoryMainId, table.disposition, table.districtId)
      .where(sql`${table.status} = 'active'`),
    index('listings_search_municipality')
      .on(table.municipalityId, table.transaction, table.categoryMainId)
      .where(sql`${table.status} = 'active'`),
    index('listings_ordering')
      .on(sql`${table.toppedUntil} DESC NULLS LAST`, sql`${table.publishedAt} DESC`)
      .where(sql`${table.status} = 'active'`),
    index('listings_geo')
      .using('gist', table.locationPoint)
      .where(sql`${table.status} = 'active'`),
    index('listings_fts').using('gin', table.searchVector),
    index('listings_attributes').using('gin', table.attributes),
    index('listings_expiration')
      .on(table.validUntil)
      .where(sql`${table.status} = 'active'`),
    index('listings_owner').on(table.ownerUserId),
    index('listings_agency').on(table.agencyId),
    check(
      'listings_byty_disposition',
      sql`${table.categoryMainId} <> 1 OR ${table.disposition} IS NOT NULL OR ${table.status} = 'draft'`,
    ),
  ],
)

export const listingMedia = pgTable(
  'listing_media',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    /** Číselné id fotky pro importní XML-RPC rozhraní, které UUID neumí. */
    seq: bigint({ mode: 'number' }).notNull().generatedAlwaysAsIdentity(),
    kind: mediaKindEnum().notNull().default('foto'),
    position: smallint().notNull().default(0),
    storageKey: text().notNull(),
    /** Zdrojová URL u importovaných fotek — worker je stáhne do storageKey. */
    sourceUrl: text(),
    /** Identifikátor fotky u kanceláře (photo_rkid) při importu přes XML-RPC. */
    externalId: text(),
    /** Otisk obsahu — brání opakovanému vložení téže fotky při každé synchronizaci. */
    contentHash: text(),
    alt: text(),
    mime: text(),
    fileSize: integer(),
    width: integer(),
    height: integer(),
    blurhash: text(),
    variants: jsonb(),
    isReady: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.listingId, table.kind, table.position),
    index('listing_media_content_hash').on(table.listingId, table.contentHash),
  ],
)

/** Historie cen — plní ji trigger při publikaci a každé změně ceny (neobejde ho ani import). */
export const priceHistory = pgTable(
  'price_history',
  {
    id: uuidPrimaryKey(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    priceAmount: numeric({ precision: 14, scale: 2, mode: 'number' }),
    priceCurrency: currencyEnum().notNull(),
    priceUnit: priceUnitEnum().notNull(),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.listingId, table.recordedAt)],
)
