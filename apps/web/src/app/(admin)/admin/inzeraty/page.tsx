import { agencies, districts, getDb, listings, municipalities, users } from '@rocket/db'
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  formatPrice,
  type ListingStatus,
} from '@rocket/shared'
import { and, desc, eq, ilike, isNotNull, isNull, sql, type SQL } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListingRowActions } from '@/features/admin/listing-row-actions'

export const metadata = { title: 'Inzeráty' }

const PAGE_SIZE = 50

type OwnerType = 'soukromy' | 'kancelar'

interface AdminListingsPageProps {
  searchParams: Promise<{
    stav?: string | string[]
    hledat?: string | string[]
    typ?: string | string[]
    strana?: string | string[]
  }>
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&')
}

function buildQueryString(params: Record<string, string>, page: number): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  if (page > 1) query.set('strana', String(page))
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const params = await searchParams
  const statusFilter = firstParam(params.stav)
  const searchTerm = firstParam(params.hledat)
  const ownerType = firstParam(params.typ)
  const page = Math.max(Number.parseInt(firstParam(params.strana), 10) || 1, 1)

  const conditions: SQL[] = [isNull(listings.deletedAt)]
  if ((LISTING_STATUSES as readonly string[]).includes(statusFilter)) {
    conditions.push(eq(listings.status, statusFilter as ListingStatus))
  }
  if (searchTerm) {
    conditions.push(ilike(listings.title, `%${escapeLikePattern(searchTerm)}%`))
  }
  if (ownerType === ('soukromy' satisfies OwnerType)) {
    conditions.push(isNull(listings.agencyId))
  } else if (ownerType === ('kancelar' satisfies OwnerType)) {
    conditions.push(isNotNull(listings.agencyId))
  }
  const whereClause = and(...conditions)

  const db = getDb()
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(whereClause)
  const total = totalRow?.count ?? 0
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const currentPage = Math.min(page, pageCount)

  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
      viewCount: listings.viewCount,
      municipalityName: municipalities.name,
      districtName: districts.name,
      ownerName: users.name,
      agencyName: agencies.name,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .leftJoin(agencies, eq(listings.agencyId, agencies.id))
    .where(whereClause)
    .orderBy(desc(listings.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE)

  const activeFilters = { stav: statusFilter, hledat: searchTerm, typ: ownerType }
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Všechny inzeráty</h1>

      <form
        method="get"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Hledat v názvu</span>
          <Input
            type="search"
            name="hledat"
            defaultValue={searchTerm}
            placeholder="Např. novostavba"
            className="w-56"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Stav</span>
          <select
            name="stav"
            defaultValue={statusFilter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Všechny stavy</option>
            {LISTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Inzerent</span>
          <select
            name="typ"
            defaultValue={ownerType}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Všichni</option>
            <option value="soukromy">Soukromníci</option>
            <option value="kancelar">Realitní kanceláře</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Filtrovat
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {rangeStart}–{rangeEnd} z {total}
        </span>
      </form>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Inzerát</th>
              <th className="px-4 py-3">Lokalita</th>
              <th className="px-4 py-3">Cena</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Inzerent</th>
              <th className="px-4 py-3 text-right">Zhlédnutí</th>
              <th className="px-4 py-3">Vloženo</th>
              <th className="px-4 py-3">Akce</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Zadaným filtrům neodpovídá žádný inzerát.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="max-w-72 truncate px-4 py-3">
                    {row.status === 'active' ? (
                      <Link href={`/detail/${row.slug}`} className="hover:text-primary">
                        {row.title}
                      </Link>
                    ) : (
                      row.title
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.municipalityName}, {row.districtName}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice({
                      amount: row.priceAmount,
                      currency: row.priceCurrency,
                      unit: row.priceUnit,
                      hidden: row.priceHidden,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={row.status === 'active' ? 'success' : 'muted'}>
                      {LISTING_STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{row.agencyName ?? row.ownerName}</td>
                  <td className="px-4 py-3 text-right">{row.viewCount}</td>
                  <td className="px-4 py-3">{row.createdAt.toLocaleDateString('cs-CZ')}</td>
                  <td className="px-4 py-3">
                    <ListingRowActions listingId={row.id} status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          {currentPage > 1 ? (
            <Link
              href={`/admin/inzeraty${buildQueryString(activeFilters, currentPage - 1)}`}
              className="text-brand-500 hover:text-primary"
            >
              ← Předchozí
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Strana {currentPage} z {pageCount}
          </span>
          {currentPage < pageCount ? (
            <Link
              href={`/admin/inzeraty${buildQueryString(activeFilters, currentPage + 1)}`}
              className="text-brand-500 hover:text-primary"
            >
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
