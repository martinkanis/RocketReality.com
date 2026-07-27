import type { ReactNode } from 'react'

/** Úzký sloupec pro informační a textové stránky (podmínky, kontakt, nápověda…). */
export default function InformacePagesLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-12">{children}</div>
}
