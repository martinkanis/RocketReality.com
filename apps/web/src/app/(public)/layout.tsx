import type { ReactNode } from 'react'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-12">{children}</div>
}
