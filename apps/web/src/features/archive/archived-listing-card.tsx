import { ARCHIVE_REASON_LABELS, type ArchiveReason } from '@rocket/shared'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface ArchivedListingCardProps {
  slug: string
  title: string
  price: string
  locality: string
  photoUrl: string | null
  reason: ArchiveReason
  archivedAt: Date | null
}

/** Karta archivované nabídky — fotka ztlumená, stav vyznačený štítkem. */
export function ArchivedListingCard({
  slug,
  title,
  price,
  locality,
  photoUrl,
  reason,
  archivedAt,
}: ArchivedListingCardProps) {
  return (
    <Link
      href={`/detail/${slug}`}
      className="group overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-soft"
    >
      <div className="relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            className="aspect-[4/3] w-full object-cover opacity-75 transition-opacity group-hover:opacity-100"
          />
        ) : (
          <div
            className="aspect-[4/3] w-full bg-gradient-to-br from-muted to-surface-alt"
            aria-hidden
          />
        )}
        <Badge variant="muted" className="absolute left-2 top-2">
          {ARCHIVE_REASON_LABELS[reason]}
        </Badge>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-heading group-hover:text-primary">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{locality}</p>
        <p className="text-sm font-semibold text-heading">{price}</p>
        {archivedAt ? (
          <p className="text-xs text-muted-foreground">
            {ARCHIVE_REASON_LABELS[reason]} {archivedAt.toLocaleDateString('cs-CZ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
