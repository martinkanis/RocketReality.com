import { integer, pgTable, smallint, text } from 'drizzle-orm/pg-core'

/** Hlavní kategorie — ID kompatibilní se sreality (1 Byty … 5 Ostatní). Seed z @rocket/shared. */
export const categoriesMain = pgTable('categories_main', {
  id: smallint().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
})

export const categoriesSub = pgTable('categories_sub', {
  id: smallint().primaryKey(),
  mainId: smallint()
    .notNull()
    .references(() => categoriesMain.id),
  slug: text().notNull(),
  name: text().notNull(),
  sort: integer().notNull().default(0),
})
