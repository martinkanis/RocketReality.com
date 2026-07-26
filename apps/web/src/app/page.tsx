import { CATEGORIES_MAIN } from '@rocket/shared'
import {
  BadgePercent,
  Building2,
  HandCoins,
  House,
  LandPlot,
  Search,
  Sparkles,
  Store,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
    title: 'Bez provizí platformě',
    description:
      'Žádná procenta z prodeje ani skryté poplatky. Platíte jen za služby, které si sami vyberete.',
  },
  {
    icon: Sparkles,
    title: 'Moderní vyhledávání',
    description:
      'Chytré filtry, hledání podle lokality a hlídací pes, který vám nové nabídky pošle sám.',
  },
] as const

function SearchPanel() {
  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-col gap-4">
        <Tabs defaultValue="prodej">
          <TabsList>
            <TabsTrigger value="prodej">Prodej</TabsTrigger>
            <TabsTrigger value="pronajem">Pronájem</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-3 md:flex-row">
          <Select defaultValue="byty">
            <SelectTrigger className="md:w-52" aria-label="Kategorie nemovitosti">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES_MAIN.map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="md:flex-1"
            placeholder="Kde hledáte? Např. Praha, Brno…"
            aria-label="Lokalita"
          />
          <Button asChild>
            <Link href="/prodej/byty">
              <Search />
              Hledat
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryTiles() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
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
          Prodávejte, pronajímejte i hledejte nový domov na portálu, kde soukromá inzerce začíná na
          0 Kč.
        </p>
      </section>
      <div className="mx-auto -mt-16 w-full max-w-4xl px-4">
        <SearchPanel />
      </div>
      <CategoryTiles />
      <Benefits />
    </>
  )
}
