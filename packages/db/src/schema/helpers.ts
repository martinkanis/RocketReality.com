import { customType, timestamp, uuid } from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

/** Case-insensitive text (extenze citext) — pro e-maily. */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext'
  },
})

/** Fulltextový vektor — plněný generovaným sloupcem, aplikace ho nečte. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

/** Primární klíč: UUIDv7 generované aplikací (řaditelné podle času). */
export function uuidPrimaryKey() {
  return uuid().primaryKey().$defaultFn(uuidv7)
}

export function createdAt() {
  return timestamp({ withTimezone: true }).notNull().defaultNow()
}

export function updatedAt() {
  return timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date())
}
