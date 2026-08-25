import { REWARD_PROTECTION_DAYS } from '@rocket/config'
import { getDb, listings, rewardPayouts } from '@rocket/db'
import { and, eq, gt, inArray, sql } from 'drizzle-orm'

/**
 * Ochrana odměn: kdo inzerát stáhne z webu dřív než po ochranné lhůtě od
 * zveřejnění, o nevyplacený nárok přijde. Označení prodáno/pronajato
 * viditelnost neukončuje (inzerát zůstává ve výpisech a v archivu), takže
 * nárok neruší — poctivý prodej se trestat nemá.
 */

export interface RevokedReward {
  payoutId: string
  listingId: string
}

/** Veřejně viditelný = aktivní, nebo archivovaný jako prodáno/pronajato. */
const IS_PUBLICLY_VISIBLE = sql`(${listings.deletedAt} IS NULL AND (${listings.status} = 'active' OR (${listings.status} = 'archived' AND ${listings.archiveReason} = ANY(ARRAY['prodano', 'pronajato']::archive_reason[]))))`

export async function revokeEarlyWithdrawnRewards(): Promise<RevokedReward[]> {
  const db = getDb()
  const protectionStart = new Date(Date.now() - REWARD_PROTECTION_DAYS * 24 * 3600 * 1000)

  const earlyWithdrawn = await db
    .select({ payoutId: rewardPayouts.id, listingId: rewardPayouts.listingId })
    .from(rewardPayouts)
    .innerJoin(listings, eq(rewardPayouts.listingId, listings.id))
    .where(
      and(
        // Vyplacené peníze zpět nebereme — hlídáme jen nevyplacené nároky.
        inArray(rewardPayouts.status, ['detected', 'approved']),
        gt(listings.publishedAt, protectionStart),
        sql`NOT ${IS_PUBLICLY_VISIBLE}`,
      ),
    )

  if (earlyWithdrawn.length === 0) return []

  await db
    .update(rewardPayouts)
    .set({
      status: 'rejected',
      note: `Inzerát přestal být veřejný před uplynutím ochranné lhůty ${REWARD_PROTECTION_DAYS} dní od zveřejnění.`,
    })
    .where(
      inArray(
        rewardPayouts.id,
        earlyWithdrawn.map((row) => row.payoutId),
      ),
    )

  return earlyWithdrawn
}
