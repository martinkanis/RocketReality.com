import { getDb, listings } from '@rocket/db'
import { and, eq, isNull } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColumnChart } from '@/features/admin/column-chart'
import {
  formatDuration,
  getAgencyListingViewSummary,
  getAgencyProfileViewSummary,
  getDailyViews,
  getListingViewSummary,
  getTopListingViews,
} from '@/features/analytics/queries'
import { requireUser } from '@/lib/require-user'
import { getAgencyMembership } from '@/lib/session'

export const metadata: Metadata = { title: 'Statistiky' }

const TOP_LISTINGS_LIMIT = 10

export default async function StatisticsPage() {
  const user = await requireUser()
  const membership = await getAgencyMembership(user.id)

  const listingFilter = membership
    ? and(eq(listings.agencyId, membership.agencyId), isNull(listings.deletedAt))!
    : and(eq(listings.ownerUserId, user.id), isNull(listings.deletedAt))!

  const [listingViews, profileViews, dailyListingViews, topListings] = await Promise.all([
    membership
      ? getAgencyListingViewSummary(membership.agencyId)
      : getListingViewSummary(user.id),
    membership ? getAgencyProfileViewSummary(membership.agencyId) : null,
    getDailyViews(listingFilter, true),
    getTopListingViews(listingFilter, TOP_LISTINGS_LIMIT),
  ])

  const tiles = [
    { label: 'Návštěvy inzerátů celkem', value: listingViews.totalViews.toLocaleString('cs-CZ') },
    { label: 'Za posledních 30 dní', value: listingViews.recentViews.toLocaleString('cs-CZ') },
    {
      label: 'Průměrně na inzerátu',
      value: formatDuration(listingViews.averageDurationSeconds),
    },
    ...(profileViews
      ? [
          {
            label: 'Návštěvy profilu kanceláře',
            value: profileViews.totalViews.toLocaleString('cs-CZ'),
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Statistiky návštěvnosti</h1>
        <p className="text-sm text-muted-foreground">
          {membership
            ? 'Návštěvnost inzerátů vaší kanceláře a jejího veřejného profilu.'
            : 'Kolik lidí si prohlédlo vaše inzeráty a jak dlouho se na nich zdrželi.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-heading">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Návštěvy inzerátů za posledních 30 dní</CardTitle>
        </CardHeader>
        <CardContent>
          <ColumnChart
            points={dailyListingViews}
            valueUnit="návštěv"
            ariaLabel="Denní počty návštěv vašich inzerátů za posledních 30 dní"
          />
        </CardContent>
      </Card>

      {profileViews ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil kanceláře</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold text-heading">
                {profileViews.totalViews.toLocaleString('cs-CZ')}
              </p>
              <p className="text-xs text-muted-foreground">Návštěv celkem</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-heading">
                {profileViews.recentViews.toLocaleString('cs-CZ')}
              </p>
              <p className="text-xs text-muted-foreground">Za 30 dní</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-heading">
                {formatDuration(profileViews.averageDurationSeconds)}
              </p>
              <p className="text-xs text-muted-foreground">Průměrná doba na profilu</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nejnavštěvovanější inzeráty</CardTitle>
        </CardHeader>
        <CardContent>
          {topListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím nemáte žádné inzeráty, ke kterým by šlo návštěvnost měřit.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Inzerát</th>
                    <th className="px-4 py-3 text-right">Návštěv</th>
                    <th className="px-4 py-3 text-right">Průměrná doba</th>
                  </tr>
                </thead>
                <tbody>
                  {topListings.map((row) => (
                    <tr key={row.listingId} className="border-b border-border last:border-0">
                      <td className="max-w-80 px-4 py-3">
                        <Link
                          href={`/detail/${row.slug}`}
                          className="line-clamp-2 hover:text-primary"
                          title={row.title}
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.views.toLocaleString('cs-CZ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatDuration(row.averageDurationSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
