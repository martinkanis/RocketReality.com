import type { EnergyLabel } from '@rocket/shared'

import { cn } from '@/lib/utils'

/** Barevná škála PENB: A zelená → G červená. */
const ENERGY_BADGE_CLASSES: Record<EnergyLabel, string> = {
  A: 'bg-green-700 text-white',
  B: 'bg-green-500 text-white',
  C: 'bg-lime-400 text-lime-950',
  D: 'bg-yellow-400 text-yellow-950',
  E: 'bg-amber-500 text-white',
  F: 'bg-orange-600 text-white',
  G: 'bg-red-600 text-white',
}

export function EnergyLabelBadge({ label }: { label: EnergyLabel }) {
  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-sm text-sm font-semibold',
        ENERGY_BADGE_CLASSES[label],
      )}
      aria-label={`Energetická třída ${label}`}
    >
      {label}
    </span>
  )
}
