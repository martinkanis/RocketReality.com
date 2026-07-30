'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createImportRpcAccess } from './actions'

interface RpcAccess {
  clientId: number
  password: string
}

/** Přehled údajů, které kancelář opíše do nastavení exportu ve svém softwaru. */
function AccessSummary({ access }: { access: RpcAccess }) {
  const rows = [
    { label: 'Adresa rozhraní', value: `${window.location.origin}/RPC2` },
    { label: 'Číslo klienta', value: String(access.clientId) },
    { label: 'Heslo k importu', value: access.password },
  ]

  return (
    <div className="mt-4 rounded-md border border-brand-300 bg-brand-50 p-4">
      <p className="text-sm font-medium text-heading">
        Přístup byl zřízen. Heslo si zkopírujte — zobrazuje se pouze teď, znovu ho nezobrazíme.
      </p>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center gap-2 text-sm">
            <dt className="w-36 shrink-0 text-muted-foreground">{row.label}</dt>
            <dd>
              <code className="rounded bg-surface px-2 py-1 font-mono break-all">{row.value}</code>
            </dd>
          </div>
        ))}
      </dl>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => void navigator.clipboard.writeText(access.password)}
      >
        Zkopírovat heslo
      </Button>
    </div>
  )
}

/**
 * Zřízení přístupu pro exportní software realitní kanceláře. Klíč softwaru
 * musí odpovídat tomu, co má kancelář nastavené ve svém exportu — vstupuje
 * do výpočtu přihlášení, takže při neshodě by se software nepřihlásil.
 */
export function CreateRpcAccessForm() {
  const [label, setLabel] = useState('')
  const [softwareKey, setSoftwareKey] = useState('')
  const [access, setAccess] = useState<RpcAccess | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await createImportRpcAccess(label, softwareKey)
      if (result.ok && result.access) {
        setAccess(result.access)
        setError(null)
        setLabel('')
        setSoftwareKey('')
      } else {
        setError(result.error ?? 'Zřízení přístupu selhalo')
      }
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Název přístupu</span>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Např. Export z realitního softwaru"
            className="w-64"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Klíč softwaru</span>
          <Input
            value={softwareKey}
            onChange={(event) => setSoftwareKey(event.target.value)}
            placeholder="Z nastavení vašeho exportu"
            className="w-64"
            required
          />
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Zřizuji…' : 'Zřídit přístup'}
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {access ? <AccessSummary access={access} /> : null}
    </div>
  )
}
