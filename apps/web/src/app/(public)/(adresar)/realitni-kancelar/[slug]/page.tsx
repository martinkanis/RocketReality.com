import { agencies, agencyMembers, getDb, listings, users } from '@rocket/db'
import { and, asc, eq } from 'drizzle-orm'
import { Globe, Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Button } from '@/components/ui/button'
import { AgencyListingCard } from '@/features/agencies/agency-listing-card'
import { AgencyLogo } from '@/features/agencies/agency-logo'
import { loadActiveListingCards } from '@/features/agencies/queries'
import { RatingStars } from '@/features/agencies/rating-stars'

const LISTINGS_PAGE_SIZE = 12

interface AgencyProfilePageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ strana?: string | string[] }>
}

const loadAgency = cache(async (slug: string) => {
  const [agency] = await getDb()
    .select({
      id: agencies.id,
      name: agencies.name,
      ico: agencies.ico,
      description: agencies.description,
      web: agencies.web,
      email: agencies.email,
      phone: agencies.phone,
      street: agencies.street,
      city: agencies.city,
      logoKey: agencies.logoKey,
      ratingAvg: agencies.ratingAvg,
      ratingCount: agencies.ratingCount,
    })
    .from(agencies)
    .where(and(eq(agencies.slug, slug), eq(agencies.status, 'active')))
    .limit(1)
  return agency ?? null
})

export async function generateMetadata({ params }: AgencyProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const agency = await loadAgency(slug)
  if (!agency) return { title: 'Realitní kancelář' }
  return {
    title: `${agency.name} — realitní kancelář`,
    description:
      agency.description ??
      `Profil realitní kanceláře ${agency.name} na RocketReality — makléři a aktuální nabídka nemovitostí.`,
  }
}

function parsePage(rawPage: string | string[] | undefined): number {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
}

export default async function AgencyProfilePage({ params, searchParams }: AgencyProfilePageProps) {
  const [{ slug }, awaitedSearchParams] = await Promise.all([params, searchParams])
  const agency = await loadAgency(slug)
  if (!agency) notFound()

  const page = parsePage(awaitedSearchParams.strana)
  const [members, listingPage] = await Promise.all([
    getDb()
      .select({ userId: users.id, name: users.name, phone: users.phone })
      .from(agencyMembers)
      .innerJoin(users, eq(agencyMembers.userId, users.id))
      .where(and(eq(agencyMembers.agencyId, agency.id), eq(agencyMembers.isActive, true)))
      .orderBy(asc(users.name)),
    loadActiveListingCards(eq(listings.agencyId, agency.id), page, LISTINGS_PAGE_SIZE),
  ])
  const totalPages = Math.max(1, Math.ceil(listingPage.total / LISTINGS_PAGE_SIZE))

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AgencyLogo name={agency.name} logoKey={agency.logoKey} className="size-20 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold">{agency.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[agency.street, agency.city].filter(Boolean).join(', ')}
            {agency.ico ? ` · IČO ${agency.ico}` : ''}
          </p>
          {agency.ratingAvg !== null && agency.ratingCount > 0 ? (
            <div className="mt-2">
              <RatingStars ratingAvg={agency.ratingAvg} ratingCount={agency.ratingCount} />
            </div>
          ) : null}
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {agency.phone ? (
              <li className="inline-flex items-center gap-1.5">
                <Phone className="size-4 text-muted-foreground" />
                <a href={`tel:${agency.phone}`} className="hover:text-primary">
                  {agency.phone}
                </a>
              </li>
            ) : null}
            {agency.email ? (
              <li className="inline-flex items-center gap-1.5">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${agency.email}`} className="hover:text-primary">
                  {agency.email}
                </a>
              </li>
            ) : null}
            {agency.web ? (
              <li className="inline-flex items-center gap-1.5">
                <Globe className="size-4 text-muted-foreground" />
                <a
                  href={agency.web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {agency.web}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </header>

      {agency.description ? <p className="mt-6 leading-relaxed">{agency.description}</p> : null}

      {members.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Makléři</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {members.map((member) => (
              <li key={member.userId}>
                <Link
                  href={`/makler/${member.userId}`}
                  className="flex flex-col rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-soft"
                >
                  <span className="font-medium text-heading">{member.name}</span>
                  {member.phone ? (
                    <span className="text-sm text-muted-foreground">{member.phone}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Aktuální nabídka ({listingPage.total})</h2>
        {listingPage.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Kancelář teď nemá žádné aktivní inzeráty.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listingPage.items.map((item) => (
              <AgencyListingCard
                key={item.id}
                slug={item.slug}
                title={item.title}
                price={item.price}
                locality={item.locality}
                photoUrl={item.photoUrl}
              />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-between" aria-label="Stránkování nabídky">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/realitni-kancelar/${slug}?strana=${page - 1}`}>Novější</Link>
              </Button>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Strana {page} z {totalPages}
            </span>
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/realitni-kancelar/${slug}?strana=${page + 1}`}>Starší</Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  )
}
