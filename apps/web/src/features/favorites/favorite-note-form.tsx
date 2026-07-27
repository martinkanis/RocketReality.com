'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { updateFavoriteNote } from '@/features/favorites/actions'

interface FavoriteNoteFormProps {
  listingId: string
  note: string | null
}

/** Inline editace poznámky k oblíbenému inzerátu. */
export function FavoriteNoteForm({ listingId, note }: FavoriteNoteFormProps) {
  const [value, setValue] = useState(note ?? '')
  const [isSaved, setIsSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      await updateFavoriteNote(listingId, value)
      setIsSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          setIsSaved(false)
        }}
        rows={2}
        placeholder="Poznámka — např. domluvená prohlídka, dojmy z inzerátu…"
        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? 'Ukládám…' : 'Uložit poznámku'}
        </Button>
        {isSaved ? <span className="text-sm text-success">Poznámka uložena.</span> : null}
      </div>
    </form>
  )
}
