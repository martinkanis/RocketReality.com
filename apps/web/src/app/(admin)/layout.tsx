import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireSuperadmin } from '@/lib/require-user'

const NAV_ITEMS = [
  { href: '/admin', label: 'Přehled' },
  { href: '/admin/moderace', label: 'Moderace' },
  { href: '/admin/odmeny', label: 'Odměny' },
  { href: '/admin/inzeraty', label: 'Inzeráty' },
  { href: '/admin/uzivatele', label: 'Uživatelé' },
  { href: '/admin/kancelare', label: 'Kanceláře' },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSuperadmin()
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Administrace
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-sm text-foreground hover:bg-surface-alt"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
