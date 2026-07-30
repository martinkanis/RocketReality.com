import { formatPrice } from '@rocket/shared'
import type { ListingStatus } from '@rocket/shared'
import { CheckCircle2, Eye, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatCzechDate } from '@/features/my-listings/format-date'
import {
  ActiveActions,
  DraftActions,
  ExpiredActions,
  RejectedActions,
} from '@/features/my-listings/listing-actions'
import { getListingCounts, getMyListings } from '@/features/my-listings/queries'
import type { ListingCountsByStatus, MyListingItem } from '@/features/my-listings/queries'
import { StatusBadge } from '@/features/my-listings/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireUser } from '@/lib/require-user'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Moje inzeráty' }

interface StatusTab {
  key: string
  label: string
  status?: ListingStatus
}

const ALL_TAB: StatusTab = { key: 'vse', label: 'Vše' }

const STATUS_TABS: StatusTab[] = [
  ALL_TAB,
  { key: 'aktivni', label: 'Aktivní', status: 'active' },
  { key: 'koncepty', label: 'Koncepty', status: 'draft' },
  { key: 'moderace', label: 'V moderaci', status: 'pending_review' },
  { key: 'zamitnute', label: 'Zamítnuté', status: 'rejected' },
  { key: 'expirovane', label: 'Expirované', status: 'expired' },
  { key: 'archivovane', label: 'Archivované', status: 'archived' },
]

function findActiveTab(stavParam: string | undefined): StatusTab {
  return STATUS_TABS.find((tab) => tab.key === stavParam) ?? ALL_TAB
}

function tabHref(tab: StatusTab): string {
  return tab.key === 'vse' ? '/muj-ucet/inzeraty' : `/muj-ucet/inzeraty?stav=${tab.key}`
}

function tabCount(tab: StatusTab, counts: ListingCountsByStatus): number {
  if (tab.status) return counts[tab.status]
  return Object.values(counts).reduce((total, value) => total + value, 0)
}

function formatListingPrice(item: MyListingItem): string {
  if (item.priceAmount === null && !item.priceHidden) return 'Cena neuvedena'
  return formatPrice({
    amount: item.priceAmount,
    currency: item.priceCurrency,
    unit: item.priceUnit,
    hidden: item.priceHidden,
  })
}

/** Detail zvládne zobrazit i neveřejný inzerát vlastníka — v moderaci vede na owner náhled. */
function hasDetailLink(status: ListingStatus): boolean {
  return status === 'active' || status === 'pending_review'
}

function ListingRowActions({ item }: { item: MyListingItem }) {
  switch (item.status) {
    case 'draft':
      return <DraftActions listingId={item.id} />
    case 'pending_review':
      return (
        <Button asChild size="sm" variant="outline">
          <Link href={`/detail/${item.slug}`}>
            <Eye />
            Náhled
          </Link>
        </Button>
      )
    case 'active':
      return (
        <ActiveActions
          listingId={item.id}
          isTopped={item.toppedUntil !== null && item.toppedUntil > new Date()}
        />
      )
    case 'rejected':
      return <RejectedActions listingId={item.id} />
    case 'expired':
      return <ExpiredActions listingId={item.id} />
    default:
      return null
  }
}

function ListingRow({ item }: { item: MyListingItem }) {
  const isTopped = item.toppedUntil !== null && item.toppedUntil > new Date()
  const title = item.title || 'Bez názvu'

  return (
    <Card className="flex-col gap-4 p-4 sm:flex-row sm:items-start">
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-20 w-28 shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="h-20 w-28 shrink-0 rounded-md bg-muted" aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {hasDetailLink(item.status) ? (
          <Link
            href={`/detail/${item.slug}`}
            className="truncate font-medium text-heading transition-colors hover:text-brand-500"
          >
            {title}
          </Link>
        ) : (
          <span className="truncate font-medium text-heading">{title}</span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {isTopped && <Badge variant="accent">TOP</Badge>}
        </div>

        {item.status === 'rejected' && item.rejectedReason && (
          <p className="text-xs text-destructive" title={item.rejectedReason}>
            Důvod zamítnutí: {item.rejectedReason}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-heading">{formatListingPrice(item)}</span>
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" />
            {item.viewCount}×
          </span>
          {item.publishedAt && <span>Zveřejněno {formatCzechDate(item.publishedAt)}</span>}
          {item.validUntil && (item.status === 'active' || item.status === 'expired') && (
            <span>Platí do {formatCzechDate(item.validUntil)}</span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <ListingRowActions item={item} />
      </div>
    </Card>
  )
}

interface MyListingsPageProps {
  searchParams: Promise<{ stav?: string; odeslano?: string }>
}

export default async function MyListingsPage({ searchParams }: MyListingsPageProps) {
  const user = await requireUser()
  const params = await searchParams
  const activeTab = findActiveTab(params.stav)

  const [counts, items] = await Promise.all([
    getListingCounts(user.id),
    getMyListings(user.id, activeTab.status),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Moje inzeráty</h1>
        <Button asChild variant="accent">
          <Link href="/vlozit-inzerat">
            <Plus />
            Vložit inzerát
          </Link>
        </Button>
      </div>

      {params.odeslano === '1' && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-bg px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          Inzerát byl odeslán ke schválení. O výsledku moderace vás budeme informovat.
        </div>
      )}

      <div className="flex flex-wrap gap-1 self-start rounded-md bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab)}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-colors',
              tab.key === activeTab.key
                ? 'bg-surface text-heading shadow-sm'
                : 'text-muted-foreground hover:text-heading',
            )}
          >
            {tab.label} ({tabCount(tab, counts)})
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
          V této kategorii nemáte žádné inzeráty.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ListingRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
