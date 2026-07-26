import { LISTING_STATUS_LABELS } from '@rocket/shared'
import type { ListingStatus } from '@rocket/shared'
import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const STATUS_VARIANTS: Record<ListingStatus, BadgeVariant> = {
  draft: 'muted',
  pending_review: 'default',
  active: 'success',
  paused: 'muted',
  expired: 'muted',
  archived: 'muted',
  rejected: 'destructive',
}

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={status === 'expired' ? 'bg-warning-bg text-warning' : undefined}
    >
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  )
}
