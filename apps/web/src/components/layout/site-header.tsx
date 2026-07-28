'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { BrandSymbol } from '@/components/layout/brand-symbol'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

const NAV_ITEMS = [
  { href: '/prodej/byty', label: 'Prodej' },
  { href: '/pronajem/byty', label: 'Pronájem' },
  { href: '/drazby/byty', label: 'Dražby' },
  { href: '/mapa', label: 'Mapa' },
  { href: '/realitni-kancelare', label: 'Realitní kanceláře' },
  { href: '/archiv', label: 'Archiv' },
] as const

const LINK_CLASS = 'text-sm font-medium transition-colors hover:text-brand-700'

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wide">
      <BrandSymbol className="size-8" />
      <span>
        <span className="text-gold-400">Rocket</span>
        <span className="text-brand-700">Nemovitosti</span>
      </span>
    </Link>
  )
}

/** Odkazy vpravo v hlavičce podle stavu přihlášení. */
function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, isPending } = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await authClient.signOut()
      onNavigate?.()
      // Plné načtení: zahodí i server-rendered stránky vyžadující přihlášení.
      window.location.assign('/')
    } catch {
      setIsSigningOut(false)
    }
  }

  // Dokud se session načítá, nenabízíme přihlášení ani odhlášení — ať odkaz nepřeskakuje.
  if (isPending) return null

  if (!session) {
    return (
      <Link href="/prihlaseni" onClick={onNavigate} className={LINK_CLASS}>
        Přihlásit se
      </Link>
    )
  }

  const isAdmin = session.user.role === 'admin'

  return (
    <>
      <Link href={isAdmin ? '/admin' : '/muj-ucet'} onClick={onNavigate} className={LINK_CLASS}>
        {isAdmin ? 'Administrace' : 'Můj účet'}
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={`${LINK_CLASS} text-left disabled:opacity-50`}
      >
        {isSigningOut ? 'Odhlašuji…' : 'Odhlásit se'}
      </button>
    </>
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
            <Link key={item.href} href={item.href} className={LINK_CLASS}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <AccountLinks />
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
          <AccountLinks onNavigate={closeMenu} />
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
