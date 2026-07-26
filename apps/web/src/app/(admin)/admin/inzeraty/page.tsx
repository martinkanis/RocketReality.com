import { districts, getDb, listings, municipalities, users } from '@rocket/db'
import { LISTING_STATUS_LABELS, formatPrice } from '@rocket/shared'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Inzeráty' }

const PAGE_SIZE = 50

export default async function AdminListingsPage() {
  const db = getDb()
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
      municipalityName: municipalities.name,
      districtName: districts.name,
      ownerName: users.name,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .innerJoin(municipalities, eq(listings.municipalityId, municipalities.id))
    .innerJoin(districts, eq(listings.districtId, districts.id))
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .orderBy(desc(listings.createdAt))
    .limit(PAGE_SIZE)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Poslední inzeráty</h1>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Inzerát</th>
              <th className="px-4 py-3">Lokalita</th>
              <th className="px-4 py-3">Cena</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Inzerent</th>
              <th className="px-4 py-3">Vloženo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
                <td className="px-4 py-3">{row.ownerName}</td>
                <td className="px-4 py-3">{row.createdAt.toLocaleDateString('cs-CZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
