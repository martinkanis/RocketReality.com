import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

interface AgencyLogoProps {
  name: string
  logoKey: string | null
  className?: string
}

/** Iniciály z názvu RK — max dvě slova („Reality Vltava" → „RV"). */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

/** Logo realitní kanceláře s fallbackem na iniciály v kruhu. */
export function AgencyLogo({ name, logoKey, className }: AgencyLogoProps) {
  if (logoKey) {
    return (
      <img
        src={mediaUrl(logoKey)}
        alt={`Logo ${name}`}
        className={cn(
          'size-14 shrink-0 rounded-full border border-border bg-surface object-contain',
          className,
        )}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground',
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  )
}
