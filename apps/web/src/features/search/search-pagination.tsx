import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { serializeSearchFilters, type SearchFilterValues } from './query-params'

const ELLIPSIS = 'ellipsis'

interface SearchPaginationProps {
  /** Aktuální cesta výpisu včetně segmentů dispozice a lokality. */
  pathname: string
  filters: SearchFilterValues
  page: number
  totalPages: number
}

/** Čísla stránek: první, poslední a okolí aktuální stránky, mezery jako výpustka. */
function buildPageItems(current: number, total: number): (number | typeof ELLIPSIS)[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b)
  const items: (number | typeof ELLIPSIS)[] = []
  let previous = 0
  for (const page of pages) {
    if (page - previous > 1) items.push(ELLIPSIS)
    items.push(page)
    previous = page
  }
  return items
}

/** Stránkování výpisu — odkazy zachovávají aktivní filtry v query. */
export function SearchPagination({ pathname, filters, page, totalPages }: SearchPaginationProps) {
  if (totalPages <= 1) return null

  const pageHref = (target: number) =>
    serializeSearchFilters(pathname, { ...filters, strana: target })
  const linkClass =
    'flex h-9 min-w-9 items-center justify-center rounded-sm border border-border bg-surface px-2 text-sm transition-colors hover:bg-muted'

  return (
    <nav aria-label="Stránkování" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link
          rel="prev"
          href={pageHref(page - 1)}
          className={linkClass}
          aria-label="Předchozí strana"
        >
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {buildPageItems(page, totalPages).map((item, index) =>
        item === ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              linkClass,
              item === page && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link rel="next" href={pageHref(page + 1)} className={linkClass} aria-label="Další strana">
          <ChevronRight className="size-4" />
        </Link>
      )}
    </nav>
  )
}
