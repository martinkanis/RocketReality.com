import { LISTING_STATUS_LABELS } from '@rocket/shared'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BreakdownList } from '@/features/admin/breakdown-list'
import { ColumnChart } from '@/features/admin/column-chart'
import {
  getDailyTrends,
  getListingBreakdowns,
  getPortalStats,
  getTopListingsByViews,
} from '@/features/admin/stats'

export const metadata = { title: 'Administrace' }

const TOP_LISTINGS_COUNT = 10

export default async function AdminDashboardPage() {
  const [stats, trends, breakdowns, topListings] = await Promise.all([
    getPortalStats(),
    getDailyTrends(),
    getListingBreakdowns(),
    getTopListingsByViews(TOP_LISTINGS_COUNT),
  ])

  const tiles = [
    { label: 'Aktivní inzeráty', value: stats.activeListings, href: '/admin/inzeraty?stav=active' },
    {
      label: 'Čeká na moderaci',
      value: stats.pendingModeration,
      href: '/admin/moderace',
    },
    { label: 'Inzeráty celkem', value: stats.totalListings, href: '/admin/inzeraty' },
    { label: 'Uživatelé', value: stats.totalUsers, href: '/admin/uzivatele' },
    { label: 'Kanceláře', value: stats.totalAgencies, href: '/admin/kancelare' },
    { label: 'Odměny ke schválení', value: stats.pendingRewards, href: '/admin/odmeny' },
    { label: 'Nové inzeráty (7 dní)', value: stats.newListingsRecent },
    { label: 'Nové registrace (7 dní)', value: stats.newUsersRecent },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-heading">Přehled portálu</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-heading">
                {tile.value.toLocaleString('cs-CZ')}
              </p>
              {tile.href ? (
                <Link href={tile.href} className="text-sm text-brand-500 hover:text-primary">
                  Zobrazit
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nové inzeráty za posledních 30 dní</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnChart
              points={trends.newListings}
              valueUnit="inzerátů"
              ariaLabel="Denní počty nově vložených inzerátů za posledních 30 dní"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nové registrace za posledních 30 dní</CardTitle>
          </CardHeader>
          <CardContent>
            <ColumnChart
              points={trends.newUsers}
              valueUnit="registrací"
              ariaLabel="Denní počty nově registrovaných uživatelů za posledních 30 dní"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inzeráty podle stavu</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList rows={breakdowns.byStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inzeráty podle kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownList rows={breakdowns.byCategory} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nejsledovanější inzeráty</CardTitle>
        </CardHeader>
        <CardContent>
          {topListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné inzeráty.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Inzerát</th>
                    <th className="px-4 py-3">Inzerent</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3 text-right">Zhlédnutí</th>
                    <th className="px-4 py-3 text-right">Dotazy</th>
                  </tr>
                </thead>
                <tbody>
                  {topListings.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="max-w-80 truncate px-4 py-3">
                        {row.status === 'active' ? (
                          <Link href={`/detail/${row.slug}`} className="hover:text-primary">
                            {row.title}
                          </Link>
                        ) : (
                          row.title
                        )}
                      </td>
                      <td className="px-4 py-3">{row.agencyName ?? row.ownerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.status === 'active' ? 'success' : 'muted'}>
                          {LISTING_STATUS_LABELS[row.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.viewCount.toLocaleString('cs-CZ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.inquiryCount.toLocaleString('cs-CZ')}
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
