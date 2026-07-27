import { PostgresListingSearch } from '@rocket/core'
import {
  CATEGORY_BYTY_ID,
  CATEGORY_MAIN_BY_SLUG,
  type CategoryMain,
  type TransactionType,
} from '@rocket/shared'
import { SearchX } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SearchParams } from 'nuqs/server'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/listing/breadcrumbs'
import { ListingCard } from '@/components/listing/listing-card'
import { Button } from '@/components/ui/button'
import { getFavoriteIds } from '@/features/favorites/actions'
import { SaveSearchButton } from '@/features/saved-searches/save-search-button'
import { buildSearchQuery } from '@/features/search/build-search-query'
import { FilterPanel } from '@/features/search/filter-panel'
import { buildSearchHeading, formatListingCount } from '@/features/search/labels'
import { loadSearchFilters } from '@/features/search/query-params'
import {
  resolveSearchSegments,
  type ResolvedSearchSegments,
} from '@/features/search/resolve-segments'
import { SearchPagination } from '@/features/search/search-pagination'
import { getSessionUser } from '@/lib/session'
import { SortSelect } from '@/features/search/sort-select'
import { buildSearchPath, TRANSACTION_BY_URL_SEGMENT } from '@/features/search/url'

interface ListingSearchPageProps {
  params: Promise<{ transakce: string; kategorie: string; filtry?: string[] }>
  searchParams: Promise<SearchParams>
}

interface SearchPageContext extends ResolvedSearchSegments {
  transaction: TransactionType
  category: CategoryMain
  isByty: boolean
}

const listingSearch = new PostgresListingSearch()

async function getSearchPageContext(
  params: Awaited<ListingSearchPageProps['params']>,
): Promise<SearchPageContext | null> {
  const transaction = TRANSACTION_BY_URL_SEGMENT.get(params.transakce)
  if (!transaction) return null
  const category = CATEGORY_MAIN_BY_SLUG.get(params.kategorie)
  if (!category) return null
  const isByty = category.id === CATEGORY_BYTY_ID
  const segments = await resolveSearchSegments(params.filtry ?? [], isByty)
  if (!segments) return null
  return { transaction, category, isByty, ...segments }
}

export async function generateMetadata({ params }: ListingSearchPageProps): Promise<Metadata> {
  const context = await getSearchPageContext(await params)
  if (!context) return {}
  const heading = buildSearchHeading({
    transaction: context.transaction,
    categorySlug: context.category.slug,
    disposition: context.disposition,
    locationName: context.location?.name,
  })
  return {
    title: { absolute: `${heading} — RocketReality` },
    description: `${heading} — aktuální nabídka nemovitostí s chytrými filtry. Soukromá inzerce od 0 Kč na RocketReality.`,
    alternates: {
      canonical: buildSearchPath({
        transaction: context.transaction,
        categorySlug: context.category.slug,
        disposition: context.disposition,
        locationSlug: context.location?.slug,
      }),
    },
  }
}

export default async function ListingSearchPage({ params, searchParams }: ListingSearchPageProps) {
  const context = await getSearchPageContext(await params)
  if (!context) notFound()

  const filters = await loadSearchFilters(searchParams)
  const query = buildSearchQuery({
    transaction: context.transaction,
    categorySlug: context.category.slug,
    pathDisposition: context.disposition,
    municipalitySlug: context.location?.municipalitySlug ?? null,
    districtSlug: context.location?.districtSlug ?? null,
    filters,
  })
  const result = await listingSearch.search(query)
  const totalPages = Math.ceil(result.total / result.pageSize)

  const sessionUser = await getSessionUser()
  const favoriteIds = sessionUser ? new Set(await getFavoriteIds()) : null

  const heading = buildSearchHeading({
    transaction: context.transaction,
    categorySlug: context.category.slug,
    disposition: context.disposition,
    locationName: context.location?.name,
  })
  const pathParts = {
    transaction: context.transaction,
    categorySlug: context.category.slug,
  }
  const categoryPath = buildSearchPath(pathParts)
  const basePath = buildSearchPath({ ...pathParts, locationSlug: context.location?.slug })
  const currentPath = buildSearchPath({
    ...pathParts,
    disposition: context.disposition,
    locationSlug: context.location?.slug,
  })

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Úvod', href: '/' },
    ...(context.disposition || context.location
      ? [
          { label: buildSearchHeading(pathParts), href: categoryPath },
          { label: [context.disposition, context.location?.name].filter(Boolean).join(' ') },
        ]
      : [{ label: buildSearchHeading(pathParts) }]),
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Breadcrumbs items={breadcrumbItems} />
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{heading}</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72" aria-label="Filtry vyhledávání">
          <FilterPanel
            basePath={basePath}
            categoryPath={categoryPath}
            pathDisposition={context.disposition}
            locationName={context.location?.name ?? null}
            isByty={context.isByty}
            isPronajem={context.transaction === 'pronajem'}
          />
        </aside>
        <section className="min-w-0 flex-1" aria-label="Výsledky vyhledávání">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Nalezeno {formatListingCount(result.total)}
            </p>
            <div className="flex items-center gap-2">
              <SaveSearchButton filters={query} defaultName={heading} />
              <SortSelect />
            </div>
          </div>
          {result.items.length > 0 ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    isFavorite={favoriteIds ? favoriteIds.has(item.id) : null}
                  />
                ))}
              </div>
              <SearchPagination
                pathname={currentPath}
                filters={filters}
                page={result.page}
                totalPages={totalPages}
              />
            </>
          ) : (
            <EmptyResults resetHref={categoryPath} />
          )}
        </section>
      </div>
    </div>
  )
}

function EmptyResults({ resetHref }: { resetHref: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-16 text-center">
      <SearchX className="size-10 text-brand-300" aria-hidden />
      <div>
        <h2 className="text-lg font-semibold">Zadaným filtrům neodpovídá žádný inzerát</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Zkuste rozšířit cenové rozpětí, vybrat větší lokalitu nebo některé filtry zrušit.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={resetHref}>Zrušit všechny filtry</Link>
      </Button>
    </div>
  )
}
