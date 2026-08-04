'use client'

import { CATEGORIES_MAIN, TRANSACTION_LABELS, TRANSACTION_TYPES, slugify } from '@rocket/shared'
import { Boxes, Building2, House, LandPlot, Search, Store, type LucideIcon } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const DEFAULT_CATEGORY = 'byty'
const DEFAULT_TRANSACTION = 'prodej'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  byty: Building2,
  domy: House,
  pozemky: LandPlot,
  komercni: Store,
  ostatni: Boxes,
}

function isTransaction(value: string | null): value is (typeof TRANSACTION_TYPES)[number] {
  return TRANSACTION_TYPES.some((transaction) => transaction === value)
}

/**
 * Vyhledávací panel na homepage — pořadí voleb drží zvyk z velkých portálů:
 * nejdřív typ nemovitosti, pak typ nabídky, nakonec lokalita.
 */
function HomeSearchPanelInner({ initialTransaction }: { initialTransaction: string }) {
  const router = useRouter()
  const [transaction, setTransaction] = useState(initialTransaction)
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [location, setLocation] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const locationSlug = slugify(location)
    router.push(`/${transaction}/${category}${locationSlug ? `/${locationSlug}` : ''}`)
  }

  return (
    <Card className="shadow-soft">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Typ nemovitosti
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {CATEGORIES_MAIN.map((item) => {
                const Icon = CATEGORY_ICONS[item.slug] ?? Boxes
                const isSelected = category === item.slug
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.slug)}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-sm font-medium transition-colors',
                      isSelected
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-border bg-surface text-heading hover:bg-muted',
                    )}
                  >
                    <Icon className="size-5" />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Typ nabídky
            </legend>
            <Tabs value={transaction} onValueChange={setTransaction}>
              <TabsList>
                {TRANSACTION_TYPES.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {TRANSACTION_LABELS[value]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </fieldset>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              className="md:flex-1"
              placeholder="Kde hledáte? Např. Praha, Brno…"
              aria-label="Lokalita"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <Button type="submit">
              <Search />
              Hledat
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Odkazy Prodej/Pronájem/Dražby v hlavičce předvolí typ nabídky přes
 * ?nabidka=…; klíč zajistí přenastavení, i když už je uživatel na homepage.
 */
function PreselectedPanel() {
  const preselected = useSearchParams().get('nabidka')
  const initialTransaction = isTransaction(preselected) ? preselected : DEFAULT_TRANSACTION
  return <HomeSearchPanelInner key={initialTransaction} initialTransaction={initialTransaction} />
}

/** useSearchParams vyžaduje Suspense — bez ní by spadl prerender homepage. */
export function HomeSearchPanel() {
  return (
    <Suspense fallback={<HomeSearchPanelInner initialTransaction={DEFAULT_TRANSACTION} />}>
      <PreselectedPanel />
    </Suspense>
  )
}
