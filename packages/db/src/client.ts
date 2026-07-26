import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { loadEnv } from '@rocket/config'
import * as schema from './schema/index'

export type Database = ReturnType<typeof createDb>

let pool: Pool | null = null
let db: Database | null = null

function createDb(connectionString: string) {
  pool = new Pool({ connectionString })
  return drizzle(pool, { schema, casing: 'snake_case' })
}

/** Sdílený DB klient procesu (web i worker). Lazy — vytvoří se při prvním použití. */
export function getDb(): Database {
  if (!db) {
    db = createDb(loadEnv().DATABASE_URL)
  }
  return db
}

/** Uzavře connection pool — pro graceful shutdown workeru a testy. */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    db = null
  }
}
