import { agencies, getDb, listings } from '@rocket/db'
import { and, asc, eq, ilike } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgencyLogo } from '@/features/agencies/agency-logo'
import { RatingStars } from '@/features/agencies/rating-stars'

export function generateMetadata(): Metadata {
  return {
    title: 'Realitní kanceláře',
    description:
      'Adresář realitních kanceláří na Rocket Nemovitosti — profily, hodnocení a aktuální nabídka nemovitostí.',
  }
}

interface AgencyDirectoryPageProps {
  searchParams: Promise<{ hledat?: string | string[] }>
}

/** Escapování LIKE zástupných znaků v uživatelském vstupu. */
function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, '\\$&')
}

/** České skloňování: „1 aktivní inzerát", „3 aktivní inzeráty", „12 aktivních inzerátů". */
function formatListingCount(count: number): string {
  if (count === 1) return '1 aktivní inzerát'
  if (count >= 2 && count <= 4) return `${count} aktivní inzeráty`
  return `${count} aktivních inzerátů`
}

export default async function AgencyDirectoryPage({ searchParams }: AgencyDirectoryPageProps) {
  const params = await searchParams
  const rawSearch = Array.isArray(params.hledat) ? params.hledat[0] : params.hledat
  const searchTerm = rawSearch?.trim() ?? ''

  const db = getDb()
  const activeOnly = eq(agencies.status, 'active')
  const rows = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      slug: agencies.slug,
      city: agencies.city,
      logoKey: agencies.logoKey,
      ratingAvg: agencies.ratingAvg,
      ratingCount: agencies.ratingCount,
      activeListingCount: db.$count(
        listings,
        and(eq(listings.agencyId, agencies.id), eq(listings.status, 'active')),
      ),
    })
    .from(agencies)
    .where(
      searchTerm
        ? and(activeOnly, ilike(agencies.name, `%${escapeLikePattern(searchTerm)}%`))
        : activeOnly,
    )
    .orderBy(asc(agencies.name))

  return (
    <div>
      <h1 className="text-3xl font-semibold">Realitní kanceláře</h1>
      <p className="mt-4 leading-relaxed">
        Profily realitních kanceláří inzerujících na Rocket Nemovitosti — s hodnocením klientů a aktuální
        nabídkou nemovitostí.
      </p>

      <form method="get" className="mt-6 flex gap-2">
        <Input
          type="search"
          name="hledat"
          defaultValue={searchTerm}
          placeholder="Hledat podle názvu kanceláře"
          aria-label="Hledat realitní kancelář"
        />
        <Button type="submit">Hledat</Button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {searchTerm
            ? `Hledání „${searchTerm}" neodpovídá žádná kancelář.`
            : 'Zatím tu není žádná realitní kancelář.'}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((agency) => (
            <li key={agency.id}>
              <Link
                href={`/realitni-kancelar/${agency.slug}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-soft"
              >
                <AgencyLogo name={agency.name} logoKey={agency.logoKey} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-heading">{agency.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {agency.city ? `${agency.city} · ` : ''}
                    {formatListingCount(agency.activeListingCount)}
                  </p>
                </div>
                {agency.ratingAvg !== null && agency.ratingCount > 0 ? (
                  <RatingStars ratingAvg={agency.ratingAvg} ratingCount={agency.ratingCount} />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
