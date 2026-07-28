import { getDb, pageViews } from '@rocket/db'
import { eq } from 'drizzle-orm'

/** Pojistka proti nesmyslným hodnotám (karta otevřená na pozadí přes noc apod.). */
const MAX_DURATION_SECONDS = 6 * 60 * 60

/** Zaznamená zobrazení detailu inzerátu pod předem vygenerovaným id (viz recordPageViewDuration). */
export async function recordListingView(id: string, listingId: string): Promise<void> {
  const db = getDb()
  await db.insert(pageViews).values({ id, listingId })
}

/** Zaznamená zobrazení profilu realitní kanceláře pod předem vygenerovaným id. */
export async function recordAgencyView(id: string, agencyId: string): Promise<void> {
  const db = getDb()
  await db.insert(pageViews).values({ id, agencyId })
}

/** Doplní délku návštěvy — volá se z beacon requestu při odchodu ze stránky. */
export async function recordPageViewDuration(id: string, durationSeconds: number): Promise<void> {
  if (!(durationSeconds > 0) || durationSeconds > MAX_DURATION_SECONDS) return
  const db = getDb()
  await db
    .update(pageViews)
    .set({ durationSeconds: Math.round(durationSeconds) })
    .where(eq(pageViews.id, id))
}
