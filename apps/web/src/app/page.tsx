import { REWARD_QR_AMOUNT_CZK } from '@rocket/config'
import { CATEGORIES_MAIN } from '@rocket/shared'
import {
  BadgePercent,
  Building2,
  HandCoins,
  House,
  LandPlot,
  Sparkles,
  Store,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { ListingCard } from '@/components/listing/listing-card'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLatestListings } from '@/features/search/latest-listings'
import { HomeSearchPanel } from '@/features/search/home-search-panel'

export const dynamic = 'force-dynamic'

const LATEST_LISTINGS_COUNT = 8

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  byty: Building2,
  domy: House,
  pozemky: LandPlot,
  komercni: Store,
  ostatni: Warehouse,
}

const BENEFITS = [
  {
    icon: BadgePercent,
    title: 'Férové ceny',
    description:
      'Soukromý inzerát u nás vložíte od 0 Kč. Jinde za stejnou inzerci zaplatíte i 72,60 Kč denně.',
  },
  {
    icon: HandCoins,
    title: 'Platíme my vám',
    description: `Žádná procenta z prodeje ani skryté poplatky. Za schválený inzerát s platebním QR kódem ve fotkách vám naopak pošleme ${REWARD_QR_AMOUNT_CZK} Kč.`,
  },
  {
    icon: Sparkles,
    title: 'Moderní vyhledávání',
    description:
      'Chytré filtry, hledání podle lokality a hlídací pes, který vám nové nabídky pošle sám.',
  },
] as const

async function LatestListings() {
  const items = await getLatestListings(LATEST_LISTINGS_COUNT)
  if (items.length === 0) return null
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Nejnovější nabídky</h2>
        <Link
          href="/prodej/byty"
          className="text-sm font-medium text-brand-500 transition-colors hover:text-primary"
        >
          Zobrazit vše
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function CategoryTiles() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-16">
      <h2 className="text-2xl font-semibold">Prohlédněte si nabídku</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES_MAIN.map((category) => {
          const Icon = CATEGORY_ICONS[category.slug] ?? Building2
          return (
            <Link
              key={category.id}
              href={`/prodej/${category.slug}`}
              className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface p-6 transition-colors outline-none hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-12 items-center justify-center rounded-md bg-brand-50 text-brand-500">
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-medium text-heading">{category.name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        <h2 className="text-2xl font-semibold">Proč RocketReality</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader>
                <span className="mb-2 flex size-12 items-center justify-center rounded-md bg-brand-50 text-brand-500">
                  <benefit.icon className="size-6" />
                </span>
                <CardTitle>{benefit.title}</CardTitle>
                <CardDescription className="leading-relaxed">{benefit.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <section className="bg-brand-700 px-4 pt-16 pb-28 text-center sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-3xl font-semibold text-white sm:text-5xl">
          Nemovitosti bez přemrštěných cen
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-brand-100 sm:text-lg">
          Inzertní server, kde neplatíte vy nám — platíme my vám. Soukromá inzerce začíná na 0 Kč a
          za inzerát s platebním QR kódem vyplácíme odměnu.
        </p>
      </section>
      <div className="mx-auto -mt-16 w-full max-w-4xl px-4">
        <HomeSearchPanel />
      </div>
      <CategoryTiles />
      <LatestListings />
      <Benefits />
    </>
  )
}
