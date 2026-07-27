import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatCzechDate } from '@/features/my-listings/format-date'
import { getListingCounts, getMyListings } from '@/features/my-listings/queries'
import { StatusBadge } from '@/features/my-listings/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/require-user'

export const metadata: Metadata = { title: 'Můj účet' }

const RECENT_LISTINGS_LIMIT = 3

export default async function DashboardOverviewPage() {
  const user = await requireUser()
  const [counts, recentListings] = await Promise.all([
    getListingCounts(user.id),
    getMyListings(user.id, undefined, RECENT_LISTINGS_LIMIT),
  ])

  const stats = [
    { label: 'Aktivní', value: counts.active },
    { label: 'Koncepty', value: counts.draft },
    { label: 'Čeká na schválení', value: counts.pending_review },
    { label: 'Zamítnuté', value: counts.rejected },
    { label: 'Expirované', value: counts.expired },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Přehled</h1>
          <p className="text-sm text-muted-foreground">Vítejte zpět, {user.name}.</p>
        </div>
        <Button asChild variant="accent">
          <Link href="/vlozit-inzerat">
            <Plus />
            Vložit inzerát
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-2xl font-semibold text-heading">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Poslední inzeráty</h2>
          <Link
            href="/muj-ucet/inzeraty"
            className="text-sm font-medium text-brand-500 hover:text-primary"
          >
            Zobrazit vše
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Zatím nemáte žádné inzeráty. Vložení je zdarma a zabere jen pár minut.
              </p>
              <Button asChild>
                <Link href="/vlozit-inzerat">Vložit první inzerát</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentListings.map((listing) => (
              <li key={listing.id}>
                <Card className="flex-row items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-heading">
                      {listing.title || 'Bez názvu'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Upraveno {formatCzechDate(listing.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={listing.status} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
