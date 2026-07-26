import { getDb, listings, moderationCases, users } from '@rocket/db'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Administrace' }

export default async function AdminDashboardPage() {
  const db = getDb()
  const [listingCounts] = await db
    .select({
      active: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'active')::int`,
      pending: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'pending_review')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(listings)
  const [pendingModeration] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(moderationCases)
    .where(eq(moderationCases.status, 'pending'))
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users)

  const tiles = [
    { label: 'Aktivní inzeráty', value: listingCounts?.active ?? 0 },
    { label: 'Čeká na moderaci', value: pendingModeration?.count ?? 0, href: '/admin/moderace' },
    { label: 'Inzeráty celkem', value: listingCounts?.total ?? 0 },
    { label: 'Uživatelé', value: userCount?.count ?? 0 },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Přehled portálu</h1>
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
              {tile.href ? (
                <Link href={tile.href} className="text-sm text-brand-500 hover:text-primary">
                  Otevřít frontu
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
