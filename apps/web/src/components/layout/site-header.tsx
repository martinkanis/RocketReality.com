'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { BrandSymbol } from '@/components/layout/brand-symbol'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/prodej/byty', label: 'Prodej' },
  { href: '/pronajem/byty', label: 'Pronájem' },
  { href: '/drazby/byty', label: 'Dražby' },
  { href: '/mapa', label: 'Mapa' },
  { href: '/realitni-kancelare', label: 'Realitní kanceláře' },
] as const

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wide">
      <BrandSymbol className="size-8" />
      <span>
        <span className="text-gold-400">Rocket</span>
        <span className="text-brand-700">Reality</span>
      </span>
    </Link>
  )
}

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Hlavní navigace">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/prihlaseni"
            className="text-sm font-medium transition-colors hover:text-brand-700"
          >
            Přihlásit se
          </Link>
          <Button asChild variant="accent" className="rounded-sm">
            <Link href="/vlozit-inzerat">Vložit inzerát zdarma</Link>
          </Button>
        </div>
        <button
          type="button"
          className="rounded-sm p-2 text-heading transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {isMenuOpen && (
        <nav
          className="flex flex-col gap-4 border-t border-border bg-surface px-4 py-4 lg:hidden"
          aria-label="Mobilní navigace"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/prihlaseni" onClick={closeMenu} className="text-sm font-medium">
            Přihlásit se
          </Link>
          <Button asChild variant="accent" className="rounded-sm">
            <Link href="/vlozit-inzerat" onClick={closeMenu}>
              Vložit inzerát zdarma
            </Link>
          </Button>
        </nav>
      )}
    </header>
  )
}
