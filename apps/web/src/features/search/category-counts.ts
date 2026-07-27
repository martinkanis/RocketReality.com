import { getDb, listings } from '@rocket/db'
import { and, eq, isNull, sql } from 'drizzle-orm'

/** Počty aktivních inzerátů podle hlavní kategorie — pro dlaždice na homepage. */
export async function getActiveCategoryCounts(): Promise<Map<number, number>> {
  const db = getDb()
  const rows = await db
    .select({ categoryMainId: listings.categoryMainId, count: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.status, 'active'), isNull(listings.deletedAt)))
    .groupBy(listings.categoryMainId)
  return new Map(rows.map((row) => [row.categoryMainId, row.count]))
}
