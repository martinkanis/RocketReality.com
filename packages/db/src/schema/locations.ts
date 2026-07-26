import { geometry, index, integer, pgTable, smallint, text } from 'drizzle-orm/pg-core'
import { krajEnum } from './enums'

/** 77 okresů ČR (LAU1) — seed z ČSÚ číselníku. */
export const districts = pgTable('districts', {
  id: smallint().primaryKey(),
  kraj: krajEnum().notNull(),
  name: text().notNull(),
  slug: text().notNull().unique(),
})

/** Obce ČR (~6 260) — seed z RÚIAN/ČSÚ. Centroid pro mapu a řazení podle vzdálenosti. */
export const municipalities = pgTable(
  'municipalities',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    districtId: smallint()
      .notNull()
      .references(() => districts.id),
    name: text().notNull(),
    slug: text().notNull().unique(),
    ruianKod: integer().unique(),
    centroid: geometry({ type: 'point', mode: 'xy', srid: 4326 }),
  },
  (table) => [index().on(table.districtId), index().on(table.name)],
)
