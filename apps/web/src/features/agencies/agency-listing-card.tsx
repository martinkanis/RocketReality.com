import Link from 'next/link'

interface AgencyListingCardProps {
  slug: string
  title: string
  price: string
  locality: string
  photoUrl: string | null
}

/** Jednoduchá karta inzerátu pro profily RK a makléřů. */
export function AgencyListingCard({
  slug,
  title,
  price,
  locality,
  photoUrl,
}: AgencyListingCardProps) {
  return (
    <Link
      href={`/detail/${slug}`}
      className="group overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-soft"
    >
      {photoUrl ? (
        <img src={photoUrl} alt={title} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div
          className="aspect-[4/3] w-full bg-gradient-to-br from-muted to-surface-alt"
          aria-hidden
        />
      )}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-heading group-hover:text-primary">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{locality}</p>
        <p className="text-sm font-semibold text-heading">{price}</p>
      </div>
    </Link>
  )
}
