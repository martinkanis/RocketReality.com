'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Field } from '../fields'
import { MAX_TITLE_LENGTH, MIN_DESCRIPTION_LENGTH } from '../types'
import type { StepProps } from '../types'

export function StepDescription({ data, onChange }: StepProps) {
  const descriptionLength = data.description.trim().length
  const isDescriptionTooShort = descriptionLength < MIN_DESCRIPTION_LENGTH

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Field id="title" label="Titulek inzerátu" required>
          <Input
            id="title"
            value={data.title}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => onChange({ title: event.target.value, titleEdited: true })}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          {data.title.length}/{MAX_TITLE_LENGTH} znaků — návrh můžete libovolně upravit.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Field id="description" label="Popis nemovitosti" required>
          <textarea
            id="description"
            rows={10}
            value={data.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Popište nemovitost, její stav, okolí a dostupnost…"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <p
          className={cn(
            'text-xs',
            isDescriptionTooShort ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {descriptionLength} znaků (minimálně {MIN_DESCRIPTION_LENGTH})
        </p>
      </div>
    </div>
  )
}
