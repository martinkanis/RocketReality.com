import {
  agencies,
  getDb,
  importFeeds,
  importJobItems,
  importJobs,
  listings,
  users,
} from '@rocket/db'
import { LISTING_STATUS_LABELS } from '@rocket/shared'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'

export const metadata = { title: 'Historie importů' }

const PAGE_LIMIT = 100

const ACTION_LABELS: Record<string, string> = {
  create: 'Vytvořen',
  update: 'Aktualizován',
  archive: 'Archivován',
  skip: 'Přeskočen',
}

const formatDateTime = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(value)
    : '—'

/**
 * Co dorazilo importním API. Bez tohoto pohledu nešlo ověřit, jestli se
 * inzerát z napojeného softwaru skutečně přijal a v jakém skončil stavu.
 */
export default async function AdminImportsPage() {
  const db = getDb()
  const rows = await db
    .select({
      itemId: importJobItems.id,
      createdAt: importJobItems.createdAt,
      externalId: importJobItems.externalId,
      action: importJobItems.action,
      status: importJobItems.status,
      errors: importJobItems.errors,
      listingId: listings.id,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingStatus: listings.status,
      listingDeletedAt: listings.deletedAt,
      feedType: importFeeds.type,
      agencyName: agencies.name,
      ownerName: users.name,
    })
    .from(importJobItems)
    .innerJoin(importJobs, eq(importJobItems.jobId, importJobs.id))
    .innerJoin(importFeeds, eq(importJobs.feedId, importFeeds.id))
    .leftJoin(listings, eq(importJobItems.listingId, listings.id))
    .leftJoin(agencies, eq(importFeeds.agencyId, agencies.id))
    .leftJoin(users, eq(importFeeds.createdByUserId, users.id))
    .orderBy(desc(importJobItems.createdAt))
    .limit(PAGE_LIMIT)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-heading">Historie importů</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Inzeráty přijaté přes API pro import. Ukazuje, co dorazilo, komu patří a v jakém stavu
        inzerát skončil — importované inzeráty procházejí moderací stejně jako ručně vložené.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Zatím nedorazil žádný import. Zkontrolujte, že odesílající software míří na{' '}
          <code className="font-mono">/api/import/inzeraty</code> a používá platný API klíč.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200">
                <th className="py-2 pr-4 font-semibold">Kdy</th>
                <th className="py-2 pr-4 font-semibold">Inzerát</th>
                <th className="py-2 pr-4 font-semibold">Externí ID</th>
                <th className="py-2 pr-4 font-semibold">Akce</th>
                <th className="py-2 pr-4 font-semibold">Stav inzerátu</th>
                <th className="py-2 font-semibold">Inzerent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.itemId} className="border-b border-brand-100 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                  <td className="py-2 pr-4">
                    {row.listingSlug ? (
                      // Admin vidí přes /detail i neveřejné (koncept, smazaný…) inzeráty.
                      <Link className="underline" href={`/detail/${row.listingSlug}`}>
                        {row.listingTitle}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Nepřijato</span>
                    )}
                    {row.status === 'error' && row.errors ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {JSON.stringify(row.errors)}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{row.externalId}</td>
                  <td className="py-2 pr-4">{ACTION_LABELS[row.action] ?? row.action}</td>
                  <td className="py-2 pr-4">
                    {row.listingStatus
                      ? `${LISTING_STATUS_LABELS[row.listingStatus]}${row.listingDeletedAt ? ' (smazán)' : ''}`
                      : '—'}
                  </td>
                  <td className="py-2">{row.agencyName ?? row.ownerName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
