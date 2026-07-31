import { REWARD_LIMITS } from '@rocket/config'
import { listAgencyRewardUsage } from '@rocket/core'
import Link from 'next/link'

export const metadata = { title: 'Čerpání odměn kancelářemi' }

const AGENCY_LIMITS = REWARD_LIMITS.agency
const MAX_AGENCY_REWARD_CZK = AGENCY_LIMITS.maxRewardedListings * AGENCY_LIMITS.amountCzkPerListing

function formatCzk(amount: number): string {
  return `${amount.toLocaleString('cs-CZ')} Kč`
}

export default async function AgencyRewardUsagePage() {
  const rows = await listAgencyRewardUsage()

  const participating = rows.filter((row) => row.rewardedListings > 0)
  const totalAwaiting = rows.reduce((sum, row) => sum + row.awaitingCzk, 0)
  const totalPaid = rows.reduce((sum, row) => sum + row.paidCzk, 0)
  const remainingSlots = Math.max(0, AGENCY_LIMITS.maxBeneficiaries - participating.length)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-heading">Čerpání odměn kancelářemi</h1>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Kolik má která kancelář zveřejněných inzerátů, kolik z nich je odměněných a kolik už dostala
        vyplaceno. Strop je {AGENCY_LIMITS.maxRewardedListings} odměněných inzerátů na kancelář (
        {formatCzk(MAX_AGENCY_REWARD_CZK)}) pro prvních {AGENCY_LIMITS.maxBeneficiaries} kanceláří.
        Limity hlídá systém sám, jednotlivé výplaty schvalujete v{' '}
        <Link href="/admin/odmeny" className="text-brand-500 hover:text-primary">
          přehledu odměn
        </Link>
        .
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted-foreground">Zapojené kanceláře</p>
          <p className="mt-1 text-xl font-semibold text-heading">
            {participating.length} / {AGENCY_LIMITS.maxBeneficiaries}
          </p>
          <p className="text-xs text-muted-foreground">Volných míst: {remainingSlots}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted-foreground">Čeká na výplatu</p>
          <p className="mt-1 text-xl font-semibold text-heading">{formatCzk(totalAwaiting)}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-xs uppercase text-muted-foreground">Vyplaceno</p>
          <p className="mt-1 text-xl font-semibold text-heading">{formatCzk(totalPaid)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Zatím nemá žádná kancelář zveřejněný inzerát.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Kancelář</th>
                <th className="py-2 pr-4">Zveřejněné inzeráty</th>
                <th className="py-2 pr-4">Odměněné</th>
                <th className="py-2 pr-4">Zbývá do stropu</th>
                <th className="py-2 pr-4">Čeká na výplatu</th>
                <th className="py-2">Vyplaceno</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const remaining = Math.max(
                  0,
                  AGENCY_LIMITS.maxRewardedListings - row.rewardedListings,
                )
                return (
                  <tr key={row.agencyId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/kancelare/${row.agencyId}`}
                        className="text-brand-500 hover:text-primary"
                      >
                        {row.agencyName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{row.publishedListings}</td>
                    <td className="py-2 pr-4">
                      {row.rewardedListings} / {AGENCY_LIMITS.maxRewardedListings}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {remaining === 0 ? 'Strop vyčerpán' : `${remaining} inzerátů`}
                    </td>
                    <td className="py-2 pr-4">{formatCzk(row.awaitingCzk)}</td>
                    <td className="py-2">{formatCzk(row.paidCzk)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
