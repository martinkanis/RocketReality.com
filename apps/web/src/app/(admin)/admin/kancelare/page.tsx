import { agencies, agencyMembers, getDb, listings } from '@rocket/db'
import { desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Realitní kanceláře' }

export default async function AdminAgenciesPage() {
  const db = getDb()
  const rows = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      slug: agencies.slug,
      ico: agencies.ico,
      city: agencies.city,
      status: agencies.status,
      createdAt: agencies.createdAt,
      memberCount: sql<number>`count(DISTINCT ${agencyMembers.userId})::int`,
      listingCount: sql<number>`count(DISTINCT ${listings.id})::int`,
    })
    .from(agencies)
    .leftJoin(agencyMembers, eq(agencyMembers.agencyId, agencies.id))
    .leftJoin(listings, eq(listings.agencyId, agencies.id))
    .groupBy(agencies.id)
    .orderBy(desc(agencies.createdAt))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-heading">Realitní kanceláře</h1>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3">Název</th>
              <th className="px-4 py-3">IČO</th>
              <th className="px-4 py-3">Město</th>
              <th className="px-4 py-3">Makléřů</th>
              <th className="px-4 py-3">Inzerátů</th>
              <th className="px-4 py-3">Stav</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/kancelare/${row.id}`} className="hover:text-primary">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.ico ?? '—'}</td>
                <td className="px-4 py-3">{row.city ?? '—'}</td>
                <td className="px-4 py-3">{row.memberCount}</td>
                <td className="px-4 py-3">{row.listingCount}</td>
                <td className="px-4 py-3">
                  {row.status === 'active' ? (
                    <Badge variant="success">Aktivní</Badge>
                  ) : (
                    <Badge variant="destructive">Pozastavena</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
