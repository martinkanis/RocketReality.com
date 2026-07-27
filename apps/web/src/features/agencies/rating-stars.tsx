import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  ratingAvg: number
  ratingCount: number
}

const STAR_COUNT = 5

/** Hvězdičkové hodnocení RK s počtem recenzí. */
export function RatingStars({ ratingAvg, ratingCount }: RatingStarsProps) {
  const filledCount = Math.round(ratingAvg)
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="inline-flex" aria-label={`Hodnocení ${ratingAvg} z 5`}>
        {Array.from({ length: STAR_COUNT }, (_, index) => (
          <Star
            key={index}
            className={cn(
              'size-4',
              index < filledCount ? 'fill-accent text-accent' : 'text-border',
            )}
          />
        ))}
      </span>
      ({ratingCount})
    </span>
  )
}
