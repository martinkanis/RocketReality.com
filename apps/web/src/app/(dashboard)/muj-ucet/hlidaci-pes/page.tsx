import { searchQuerySchema } from '@rocket/core'
import { getDb, savedSearches } from '@rocket/db'
import { desc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { describeSearchFilters } from '@/features/saved-searches/describe-filters'
import { SavedSearchItem } from '@/features/saved-searches/saved-search-item'
import { buildSearchUrl } from '@/features/saved-searches/search-url'
import { requireUser } from '@/lib/require-user'

export const metadata: Metadata = { title: 'Hlídací pes' }

export default async function SavedSearchesPage() {
  const user = await requireUser()
  const rows = await getDb()
    .select({
      id: savedSearches.id,
      name: savedSearches.name,
      filters: savedSearches.filters,
      frequency: savedSearches.frequency,
      isActive: savedSearches.isActive,
    })
    .from(savedSearches)
    .where(eq(savedSearches.userId, user.id))
    .orderBy(desc(savedSearches.createdAt))

  const items = rows.map((row) => {
    const parsedFilters = searchQuerySchema.safeParse(row.filters)
    return {
      id: row.id,
      name: row.name,
      frequency: row.frequency,
      isActive: row.isActive,
      description: parsedFilters.success
        ? describeSearchFilters(parsedFilters.data)
        : '(neplatný filtr)',
      searchUrl: parsedFilters.success ? buildSearchUrl(parsedFilters.data) : null,
    }
  })

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-heading">Hlídací pes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {items.length === 0
          ? 'Zatím nemáte žádné uložené hledání.'
          : 'Nové inzeráty odpovídající uloženým filtrům vám pošleme e-mailem.'}
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Hlídacího psa nastavíte tlačítkem „Hlídat toto hledání" přímo ve výsledcích vyhledávání.
          </p>
          <Button asChild>
            <Link href="/prodej/byty">Prozkoumat nabídku</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <SavedSearchItem
              key={item.id}
              id={item.id}
              name={item.name}
              description={item.description}
              frequency={item.frequency}
              isActive={item.isActive}
              searchUrl={item.searchUrl}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
