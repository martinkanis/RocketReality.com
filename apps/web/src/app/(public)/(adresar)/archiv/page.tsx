import { ARCHIVE_VISIBILITY_DAYS } from '@rocket/shared'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArchivedListingCard } from '@/features/archive/archived-listing-card'
import { getArchiveCounts, loadArchivedListingCards } from '@/features/archive/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Archiv nabídek',
  description:
    'Nedávno prodané a pronajaté nemovitosti — přehled realizovaných nabídek pro porovnání cen v lokalitě.',
}

const PAGE_SIZE = 24

interface ArchivePageProps {
  searchParams: Promise<{ strana?: string | string[] }>
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  return Math.max(Number.parseInt(raw ?? '1', 10) || 1, 1)
}

/** České skloňování: „1 nabídka", „3 nabídky", „12 nabídek". */
function formatOfferCount(count: number): string {
  if (count === 1) return '1 nabídka'
  if (count >= 2 && count <= 4) return `${count} nabídky`
  return `${count.toLocaleString('cs-CZ')} nabídek`
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const page = parsePage((await searchParams).strana)
  const [listingPage, counts] = await Promise.all([
    loadArchivedListingCards(page, PAGE_SIZE),
    getArchiveCounts(),
  ])
  const totalPages = Math.max(1, Math.ceil(listingPage.total / PAGE_SIZE))

  return (
    <div>
      <h1 className="text-3xl font-semibold">Archiv nabídek</h1>
      <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
        Nemovitosti, které se u nás nedávno prodaly nebo pronajaly. Necháváme je dostupné{' '}
        {ARCHIVE_VISIBILITY_DAYS} dní od uzavření obchodu, abyste si mohli porovnat ceny v lokalitě.
        Tyto nabídky už nejsou aktivní a nelze na ně reagovat.
      </p>
      {listingPage.total > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {formatOfferCount(counts.prodano)} prodáno · {formatOfferCount(counts.pronajato)}{' '}
          pronajato
        </p>
      ) : null}

      {listingPage.items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            V archivu zatím nic není — jakmile se první nabídka prodá nebo pronajme, objeví se tady.
          </p>
          <Link
            href="/prodej/byty"
            className="mt-3 inline-block text-sm font-medium text-brand-500 hover:text-primary"
          >
            Prohlédnout aktuální nabídku
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {listingPage.items.map((item) => (
            <ArchivedListingCard
              key={item.id}
              slug={item.slug}
              title={item.title}
              price={item.price}
              locality={item.locality}
              photoUrl={item.photoUrl}
              reason={item.reason}
              archivedAt={item.archivedAt}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={page - 1 === 1 ? '/archiv' : `/archiv?strana=${page - 1}`}
              className="text-brand-500 hover:text-primary"
            >
              ← Předchozí
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Strana {page} z {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/archiv?strana=${page + 1}`} className="text-brand-500 hover:text-primary">
              Další →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  )
}
