import type { ReactNode } from 'react'

/** Široký kontejner pro adresář a profily realitních kanceláří a makléřů. */
export default function AdresarPagesLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-10">{children}</div>
}
