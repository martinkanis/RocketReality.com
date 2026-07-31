'use client'

import { BarChart3, BellRing, Heart, KeyRound, LayoutDashboard, List, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/muj-ucet', label: 'Přehled', icon: LayoutDashboard, exact: true },
  { href: '/muj-ucet/inzeraty', label: 'Moje inzeráty', icon: List },
  { href: '/muj-ucet/statistiky', label: 'Statistiky', icon: BarChart3 },
  { href: '/muj-ucet/oblibene', label: 'Oblíbené', icon: Heart },
  { href: '/muj-ucet/hlidaci-pes', label: 'Hlídací pes', icon: BellRing },
  { href: '/muj-ucet/api-klice', label: 'API klíče', icon: KeyRound },
  { href: '/muj-ucet/nastaveni', label: 'Nastavení', icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigace účtu" className="flex gap-1 overflow-x-auto lg:flex-col">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-muted-foreground hover:bg-muted hover:text-heading',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
