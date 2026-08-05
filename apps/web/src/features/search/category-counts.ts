import { getDb, listings } from '@rocket/db'
import type { TransactionType } from '@rocket/shared'
import { and, eq, isNull, sql } from 'drizzle-orm'

/**
 * Počty aktivních inzerátů podle hlavní kategorie — pro dlaždice na homepage.
 * Typ nabídky musí odpovídat tomu, kam dlaždice vedou, jinak by počet
 * u dlaždice sliboval víc, než kolik výpis ukáže.
 */
export async function getActiveCategoryCounts(
  transaction: TransactionType,
): Promise<Map<number, number>> {
  const db = getDb()
  const rows = await db
    .select({ categoryMainId: listings.categoryMainId, count: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(
        eq(listings.status, 'active'),
        eq(listings.transaction, transaction),
        isNull(listings.deletedAt),
      ),
    )
    .groupBy(listings.categoryMainId)
  return new Map(rows.map((row) => [row.categoryMainId, row.count]))
}
