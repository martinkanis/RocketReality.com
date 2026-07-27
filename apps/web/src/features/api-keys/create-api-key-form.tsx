'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createApiKey } from './actions'

/** Formulář vytvoření klíče — plaintext se zobrazí jedinkrát po vytvoření. */
export function CreateApiKeyForm() {
  const [label, setLabel] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await createApiKey(label)
      if (result.ok && result.apiKey) {
        setCreatedKey(result.apiKey)
        setError(null)
        setLabel('')
      } else {
        setError(result.error ?? 'Vytvoření klíče selhalo')
      }
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Název klíče</span>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Např. ProLife Reality CMS"
            className="w-64"
            required
          />
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Vytvářím…' : 'Vytvořit klíč'}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {createdKey ? (
        <div className="mt-4 rounded-md border border-brand-300 bg-brand-50 p-4">
          <p className="text-sm font-medium text-heading">
            Klíč byl vytvořen. Zkopírujte si ho — zobrazuje se pouze teď, znovu ho nezobrazíme.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-surface px-2 py-1 font-mono text-sm break-all">
              {createdKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(createdKey)}
            >
              Zkopírovat
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
