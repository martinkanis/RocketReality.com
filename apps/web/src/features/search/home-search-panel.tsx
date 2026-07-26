'use client'

import { CATEGORIES_MAIN, slugify } from '@rocket/shared'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DEFAULT_CATEGORY = 'byty'

/** Vyhledávací panel na homepage — sestaví cestu výpisu a naviguje na ni. */
export function HomeSearchPanel() {
  const router = useRouter()
  const [transaction, setTransaction] = useState('prodej')
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
          <Tabs value={transaction} onValueChange={setTransaction}>
            <TabsList>
              <TabsTrigger value="prodej">Prodej</TabsTrigger>
              <TabsTrigger value="pronajem">Pronájem</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-3 md:flex-row">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-52" aria-label="Kategorie nemovitosti">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES_MAIN.map((item) => (
                  <SelectItem key={item.id} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
