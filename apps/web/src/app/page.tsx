import {
  REWARD_MAX_ADVERTISERS,
  REWARD_MAX_LISTINGS_PER_ADVERTISER,
  REWARD_QR_AMOUNT_CZK,
} from '@rocket/config'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getFavoriteListingItems } from '@/features/favorites/favorite-listing-items'
import { getActiveCategoryCounts } from '@/features/search/category-counts'
import { getLatestListings } from '@/features/search/latest-listings'
import { HomeSearchPanel } from '@/features/search/home-search-panel'
import { NearbyListings } from '@/features/search/nearby-listings'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SECTION_LISTINGS_COUNT = 8

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
    description: `Žádná procenta z prodeje ani skryté poplatky. Za zveřejněný inzerát s platebním QR kódem ve fotkách vám naopak pošleme ${REWARD_QR_AMOUNT_CZK} Kč — akce platí pro prvních ${REWARD_MAX_ADVERTISERS} inzerentů, až ${REWARD_MAX_LISTINGS_PER_ADVERTISER} inzerátů na inzerenta.`,
  },
  {
    icon: Sparkles,
    title: 'Moderní vyhledávání',
    description:
      'Chytré filtry, hledání podle lokality a hlídací pes, který vám nové nabídky pošle sám.',
  },
] as const

/** České skloňování počtu nabídek: 1 nabídka, 3 nabídky, 12 nabídek. */
function formatOfferCount(count: number): string {
  if (count === 1) return '1 nabídka'
  if (count >= 2 && count <= 4) return `${count} nabídky`
  return `${count.toLocaleString('cs-CZ')} nabídek`
}

async function CategoryTiles() {
  const counts = await getActiveCategoryCounts()
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
              <span className="text-xs text-muted-foreground">
                {formatOfferCount(counts.get(category.id) ?? 0)}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

async function ListingsForYou() {
  const user = await getSessionUser()
  const [latest, saved] = await Promise.all([
    getLatestListings(SECTION_LISTINGS_COUNT),
    user ? getFavoriteListingItems(user.id, SECTION_LISTINGS_COUNT) : Promise.resolve([]),
  ])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold">Nemovitosti pro vás</h2>
      <Tabs defaultValue="doporucene" className="mt-6">
        <TabsList>
          <TabsTrigger value="doporucene">Doporučené pro vás</TabsTrigger>
          <TabsTrigger value="ulozene">Moje uložené</TabsTrigger>
          <TabsTrigger value="okoli">V okolí</TabsTrigger>
        </TabsList>
        <TabsContent value="doporucene" className="mt-6">
          {latest.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Zatím tu žádné nabídky nejsou — buďte první, kdo inzerát vloží.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {latest.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/prodej/byty"
                  className="text-sm font-medium text-brand-500 transition-colors hover:text-primary"
                >
                  Zobrazit další nabídky
                </Link>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="ulozene" className="mt-6">
          {!user ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Uložené nabídky uvidíte po{' '}
              <Link href="/prihlaseni" className="text-brand-500 hover:text-primary">
                přihlášení
              </Link>
              .
            </p>
          ) : saved.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Zatím nemáte žádné uložené nabídky — srdíčkem u inzerátu si je sem přidáte.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {saved.map((item) => (
                  <ListingCard key={item.id} item={item} isFavorite />
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/muj-ucet/oblibene"
                  className="text-sm font-medium text-brand-500 transition-colors hover:text-primary"
                >
                  Všechny uložené nabídky
                </Link>
              </div>
            </>
          )}
        </TabsContent>
        <TabsContent value="okoli" className="mt-6">
          <NearbyListings />
        </TabsContent>
      </Tabs>
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
          Inzertní server, kde neplatíte vy nám — platíme my vám. Prvních {REWARD_MAX_ADVERTISERS}{' '}
          inzerentů od nás dostane {REWARD_QR_AMOUNT_CZK} Kč za každý zveřejněný inzerát s platebním
          QR kódem. Až {REWARD_QR_AMOUNT_CZK * REWARD_MAX_LISTINGS_PER_ADVERTISER} Kč na účet.
        </p>
      </section>
      <div className="mx-auto -mt-16 w-full max-w-4xl px-4">
        <HomeSearchPanel />
      </div>
      <CategoryTiles />
      <ListingsForYou />
      <Benefits />
    </>
  )
}
