import Link from 'next/link'

const OFFER_LINKS = [
  { href: '/prodej/byty', label: 'Prodej bytů' },
  { href: '/prodej/domy', label: 'Prodej domů' },
  { href: '/prodej/pozemky', label: 'Prodej pozemků' },
  { href: '/pronajem/byty', label: 'Pronájem bytů' },
  { href: '/drazby/byty', label: 'Dražby' },
] as const

const COMPANY_LINKS = [
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/podminky', label: 'Podmínky užití' },
  { href: '/ochrana-osobnich-udaju', label: 'Ochrana osobních údajů' },
  { href: '/napoveda', label: 'Nápověda' },
  { href: '/api-dokumentace', label: 'API pro import inzerátů' },
] as const

interface FooterColumnProps {
  title: string
  links: readonly { href: string; label: string }[]
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wide text-white uppercase">{title}</h2>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-950 text-brand-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-semibold tracking-wide">
            <span className="text-gold-400">Rocket</span>
            <span className="text-white">Reality</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Český realitní portál s férovými cenami. Soukromá inzerce od 0 Kč, žádné provize
            platformě.
          </p>
        </div>
        <FooterColumn title="Nabídka" links={OFFER_LINKS} />
        <FooterColumn title="Společnost" links={COMPANY_LINKS} />
      </div>
      <div className="border-t border-brand-800">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm">© 2026 RocketReality.cz</p>
      </div>
    </footer>
  )
}
