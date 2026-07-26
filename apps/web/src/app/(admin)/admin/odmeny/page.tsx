import { buildSpayd } from '@rocket/core'
import { getDb, listings, rewardPayouts } from '@rocket/db'
import { desc, eq, sql } from 'drizzle-orm'
import QRCode from 'qrcode'
import { RewardHistoryTable } from '@/features/rewards/reward-history-table'
import { RewardApproveCard } from '@/features/rewards/reward-approve-card'
import { RewardPayoutCard } from '@/features/rewards/reward-payout-card'

export const metadata = { title: 'Odměny za QR inzeráty' }

export default async function AdminRewardsPage() {
  const db = getDb()
  const rows = await db
    .select({
      id: rewardPayouts.id,
      status: rewardPayouts.status,
      iban: rewardPayouts.iban,
      amountCzk: rewardPayouts.amountCzk,
      note: rewardPayouts.note,
      createdAt: rewardPayouts.createdAt,
      paidAt: rewardPayouts.paidAt,
      listingTitle: listings.title,
      listingSlug: listings.slug,
      listingStatus: listings.status,
      /** Kolikrát už stejný IBAN dostal (nebo má schválenou) odměnu — ochrana proti farmaření. */
      ibanPayoutCount: sql<number>`(
        SELECT count(*)::int FROM ${rewardPayouts} other
        WHERE other.iban = ${rewardPayouts.iban}
          AND other.id <> ${rewardPayouts.id}
          AND other.status IN ('approved', 'paid')
      )`,
    })
    .from(rewardPayouts)
    .innerJoin(listings, eq(rewardPayouts.listingId, listings.id))
    .orderBy(desc(rewardPayouts.createdAt))
    .limit(100)

  const detected = rows.filter((row) => row.status === 'detected')
  const approved = rows.filter((row) => row.status === 'approved')
  const history = rows.filter((row) => inArrayStatus(row.status))

  const approvedWithQr = await Promise.all(
    approved.map(async (row) => ({
      ...row,
      qrDataUrl: await QRCode.toDataURL(
        buildSpayd({
          iban: row.iban,
          amountCzk: row.amountCzk,
          message: 'Odmena RocketReality',
        }),
        { width: 240, margin: 1 },
      ),
    })),
  )

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-2 text-2xl font-semibold text-heading">Odměny za QR inzeráty</h1>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Worker automaticky hledá ve fotkách inzerátů platební QR kódy (SPAYD). Odměnu schvaluje a
          vyplácí vždy admin — naskenováním výplatního QR ve své bankovní aplikaci. Aplikace sama
          žádné peníze neodesílá.
        </p>
        <h2 className="mb-3 text-lg font-semibold text-heading">
          Ke schválení ({detected.length})
        </h2>
        {detected.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádní kandidáti na odměnu.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {detected.map((row) => (
              <RewardApproveCard
                key={row.id}
                id={row.id}
                iban={row.iban}
                amountCzk={row.amountCzk}
                listingTitle={row.listingTitle}
                listingSlug={row.listingSlug}
                listingStatus={row.listingStatus}
                ibanPayoutCount={row.ibanPayoutCount}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-heading">
          K vyplacení ({approvedWithQr.length})
        </h2>
        {approvedWithQr.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nic nečeká na výplatu.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {approvedWithQr.map((row) => (
              <RewardPayoutCard
                key={row.id}
                id={row.id}
                iban={row.iban}
                amountCzk={row.amountCzk}
                listingTitle={row.listingTitle}
                qrDataUrl={row.qrDataUrl}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-heading">Historie</h2>
        <RewardHistoryTable
          rows={history.map((row) => ({
            id: row.id,
            iban: row.iban,
            amountCzk: row.amountCzk,
            status: row.status,
            listingTitle: row.listingTitle,
            note: row.note,
            paidAt: row.paidAt ? row.paidAt.toLocaleDateString('cs-CZ') : null,
          }))}
        />
      </section>
    </div>
  )
}

function inArrayStatus(status: string): boolean {
  return status === 'paid' || status === 'rejected'
}
