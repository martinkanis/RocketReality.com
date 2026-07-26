import { agencies, agencyMembers, getDb, listings, users } from '@rocket/db'
import { and, eq } from 'drizzle-orm'
import { Building2, Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { AgencyListingCard } from '@/features/agencies/agency-listing-card'
import { loadActiveListingCards } from '@/features/agencies/queries'

const MAX_AGENT_LISTINGS = 60

interface AgentProfilePageProps {
  params: Promise<{ id: string }>
}

/** Profil makléře — jen uživatel s aktivním členstvím v aktivní RK. */
const loadAgentProfile = cache(async (userId: string) => {
  const [profile] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      agencyName: agencies.name,
      agencySlug: agencies.slug,
    })
    .from(agencyMembers)
    .innerJoin(users, eq(agencyMembers.userId, users.id))
    .innerJoin(agencies, eq(agencyMembers.agencyId, agencies.id))
    .where(
      and(
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.isActive, true),
        eq(agencies.status, 'active'),
      ),
    )
    .limit(1)
  return profile ?? null
})

export async function generateMetadata({ params }: AgentProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const profile = await loadAgentProfile(id)
  if (!profile) return { title: 'Makléř' }
  return {
    title: `${profile.name} — makléř ${profile.agencyName}`,
    description: `Profil makléře ${profile.name} z realitní kanceláře ${profile.agencyName} — kontakty a aktuální nabídka nemovitostí.`,
  }
}

export default async function AgentProfilePage({ params }: AgentProfilePageProps) {
  const { id } = await params
  const profile = await loadAgentProfile(id)
  if (!profile) notFound()

  const listingPage = await loadActiveListingCards(
    eq(listings.ownerUserId, profile.id),
    1,
    MAX_AGENT_LISTINGS,
  )

  return (
    <div>
      <header>
        <h1 className="text-3xl font-semibold">{profile.name}</h1>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <li className="inline-flex items-center gap-1.5">
            <Building2 className="size-4 text-muted-foreground" />
            <Link href={`/realitni-kancelar/${profile.agencySlug}`} className="hover:text-primary">
              {profile.agencyName}
            </Link>
          </li>
          {profile.phone ? (
            <li className="inline-flex items-center gap-1.5">
              <Phone className="size-4 text-muted-foreground" />
              <a href={`tel:${profile.phone}`} className="hover:text-primary">
                {profile.phone}
              </a>
            </li>
          ) : null}
          <li className="inline-flex items-center gap-1.5">
            <Mail className="size-4 text-muted-foreground" />
            <a href={`mailto:${profile.email}`} className="hover:text-primary">
              {profile.email}
            </a>
          </li>
        </ul>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Aktuální nabídka ({listingPage.total})</h2>
        {listingPage.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Makléř teď nemá žádné aktivní inzeráty.
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
      </section>
    </div>
  )
}
