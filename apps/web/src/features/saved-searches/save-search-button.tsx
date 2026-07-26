'use client'

import { SAVED_SEARCH_FREQUENCIES, SAVED_SEARCH_FREQUENCY_LABELS } from '@rocket/shared'
import type { SavedSearchFrequency } from '@rocket/shared'
import { BellRing } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createSavedSearch } from '@/features/saved-searches/actions'

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

interface SaveSearchButtonProps {
  /** Filtry aktuálního výpisu ve tvaru SearchQuery — validuje server action. */
  filters: unknown
  /** Předvyplněný název — lidský popis filtrů. */
  defaultName: string
}

export function SaveSearchButton({ filters, defaultName }: SaveSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [frequency, setFrequency] = useState<SavedSearchFrequency>('denne')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      await createSavedSearch(formString(formData, 'name'), filters, frequency)
      setIsOpen(false)
    } catch {
      setError('Hlídacího psa se nepodařilo uložit. Zkuste to prosím znovu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <BellRing />
          Hlídat toto hledání
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hlídat toto hledání</DialogTitle>
          <DialogDescription>
            Nové inzeráty odpovídající filtrům vám pošleme e-mailem.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="save-search-name">Název</Label>
            <Input id="save-search-name" name="name" defaultValue={defaultName} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Frekvence upozornění</Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as SavedSearchFrequency)}
            >
              <SelectTrigger>
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ukládám…' : 'Nastavit hlídacího psa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
