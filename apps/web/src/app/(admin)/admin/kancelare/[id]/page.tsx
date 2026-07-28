import { agencies, agencyMembers, getDb, listings, users } from '@rocket/db'
import { AGENCY_ROLE_LABELS, LISTING_STATUS_LABELS, formatPrice } from '@rocket/shared'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAgencyStats } from '@/features/admin/stats'

export const metadata = { title: 'Detail kanceláře' }

const LISTING_LIMIT = 100

interface AdminAgencyDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminAgencyDetailPage({ params }: AdminAgencyDetailPageProps) {
  const { id } = await params
  const db = getDb()
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1)
  if (!agency) notFound()

  const [stats, members, agencyListings] = await Promise.all([
    getAgencyStats(agency.id),
    db
      .select({
        userId: agencyMembers.userId,
        role: agencyMembers.role,
        isActive: agencyMembers.isActive,
        name: users.name,
        email: users.email,
      })
      .from(agencyMembers)
      .innerJoin(users, eq(agencyMembers.userId, users.id))
      .where(eq(agencyMembers.agencyId, agency.id)),
    db
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
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(eq(listings.agencyId, agency.id))
      .orderBy(desc(listings.createdAt))
      .limit(LISTING_LIMIT),
  ])

  const tiles = [
    { label: 'Makléřů', value: stats.memberCount },
    { label: 'Aktivní inzeráty', value: stats.activeListings },
    { label: 'Inzeráty celkem', value: stats.totalListings },
    { label: 'Zhlédnutí celkem', value: stats.totalViews },
    { label: 'Dotazy celkem', value: stats.totalInquiries },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/kancelare" className="text-sm text-brand-500 hover:text-primary">
          ← Zpět na kanceláře
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-heading">{agency.name}</h1>
          {agency.status === 'active' ? (
            <Badge variant="success">Aktivní</Badge>
          ) : (
            <Badge variant="destructive">Pozastavena</Badge>
          )}
          <Link
            href={`/realitni-kancelar/${agency.slug}`}
            className="text-sm text-brand-500 hover:text-primary"
          >
            Veřejný profil
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[
            agency.ico ? `IČO ${agency.ico}` : null,
            agency.city,
            agency.email,
            agency.phone,
            agency.web,
          ]
            .filter(Boolean)
            .join(' · ') || 'Bez kontaktních údajů'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Makléři a správci</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kancelář nemá žádné členy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Jméno</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.userId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{member.name}</td>
                      <td className="px-4 py-3">{member.email}</td>
                      <td className="px-4 py-3">{AGENCY_ROLE_LABELS[member.role]}</td>
                      <td className="px-4 py-3">
                        {member.isActive ? (
                          <Badge variant="success">Aktivní</Badge>
                        ) : (
                          <Badge variant="muted">Neaktivní</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inzeráty kanceláře</CardTitle>
        </CardHeader>
        <CardContent>
          {agencyListings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kancelář zatím nemá žádné inzeráty.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Inzerát</th>
                    <th className="px-4 py-3">Cena</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3 text-right">Zhlédnutí</th>
                    <th className="px-4 py-3">Vloženo</th>
                  </tr>
                </thead>
                <tbody>
                  {agencyListings.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="max-w-80 px-4 py-3">
                        {row.status === 'active' ? (
                          <Link
                            href={`/detail/${row.slug}`}
                            className="line-clamp-2 hover:text-primary"
                            title={row.title}
                          >
                            {row.title}
                          </Link>
                        ) : (
                          <span className="line-clamp-2" title={row.title}>
                            {row.title}
                          </span>
                        )}
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
                      <td className="px-4 py-3 text-right">{row.viewCount}</td>
                      <td className="px-4 py-3">{row.createdAt.toLocaleDateString('cs-CZ')}</td>
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
