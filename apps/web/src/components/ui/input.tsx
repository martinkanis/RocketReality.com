import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
