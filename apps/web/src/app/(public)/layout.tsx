import { NuqsAdapter } from 'nuqs/adapters/next/app'
import type { ReactNode } from 'react'

/**
 * Veřejná část webu. Šířku obsahu si řídí jednotlivé route groups
 * (úzké informační stránky mají vlastní layout v (informace)/).
 * NuqsAdapter zpřístupňuje URL query state filtrům výpisu.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
