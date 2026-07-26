import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-700',
        accent: 'bg-accent text-accent-foreground',
        success: 'bg-success-bg text-success',
        muted: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive-bg text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants, type BadgeProps }
