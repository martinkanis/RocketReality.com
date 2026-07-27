'use client'

import { SAVED_SEARCH_FREQUENCIES, SAVED_SEARCH_FREQUENCY_LABELS } from '@rocket/shared'
import type { SavedSearchFrequency } from '@rocket/shared'
import { Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteSavedSearch, updateSavedSearch } from '@/features/saved-searches/actions'

interface SavedSearchItemProps {
  id: string
  name: string
  /** Lidský popis filtrů, případně „(neplatný filtr)". */
  description: string
  frequency: SavedSearchFrequency
  isActive: boolean
  /** URL výpisu podle filtrů — null, když jsou filtry nevalidní. */
  searchUrl: string | null
}

export function SavedSearchItem({
  id,
  name,
  description,
  frequency,
  isActive,
  searchUrl,
}: SavedSearchItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleFrequencyChange(value: string) {
    startTransition(async () => {
      await updateSavedSearch(id, { frequency: value as SavedSearchFrequency })
    })
  }

  function handleActiveChange(checked: boolean) {
    startTransition(async () => {
      await updateSavedSearch(id, { isActive: checked })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSavedSearch(id)
      setIsDeleteDialogOpen(false)
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-heading">
            {name}
            {isActive ? null : <Badge variant="muted">Vypnuto</Badge>}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive-bg hover:text-destructive"
            >
              <Trash2 />
              Smazat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat hlídacího psa?</DialogTitle>
              <DialogDescription>
                Hlídání „{name}" se zruší a upozornění už nepřijdou. Akci nelze vrátit.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isPending}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'Mažu…' : 'Smazat'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-44">
          <Select value={frequency} onValueChange={handleFrequencyChange} disabled={isPending}>
            <SelectTrigger aria-label="Frekvence upozornění">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAVED_SEARCH_FREQUENCIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {SAVED_SEARCH_FREQUENCY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`saved-search-active-${id}`}
            checked={isActive}
            onCheckedChange={(checked) => handleActiveChange(checked === true)}
            disabled={isPending}
          />
          <Label htmlFor={`saved-search-active-${id}`}>Aktivní</Label>
        </div>
        {searchUrl ? (
          <Button asChild variant="outline" size="sm">
            <Link href={searchUrl}>
              <Search />
              Spustit hledání
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  )
}
