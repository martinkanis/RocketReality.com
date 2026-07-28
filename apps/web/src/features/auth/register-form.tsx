'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { registerUserAction } from './actions'

type AccountType = 'soukromnik' | 'profesional'

interface AresPreview {
  name: string
  street: string | null
  city: string | null
  postalCode: string | null
}

function formatAresAddress(preview: AresPreview): string {
  return [preview.street, [preview.postalCode, preview.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>('soukromnik')
  const [ico, setIco] = useState('')
  const [aresPreview, setAresPreview] = useState<AresPreview | null>(null)
  const [aresError, setAresError] = useState<string | null>(null)
  const [isLookingUpAres, setIsLookingUpAres] = useState(false)

  async function lookupAres() {
    if (!/^\d{8}$/.test(ico)) {
      setAresError('IČO musí mít přesně 8 číslic')
      return
    }
    setIsLookingUpAres(true)
    setAresError(null)
    setAresPreview(null)
    try {
      const response = await fetch(`/api/ares/${ico}`)
      const data = (await response.json()) as AresPreview & { error?: string }
      if (!response.ok) {
        setAresError(data.error ?? 'Vyhledání v ARES selhalo')
        return
      }
      setAresPreview(data)
    } catch {
      setAresError('Vyhledání v ARES selhalo, zkuste to prosím znovu')
    } finally {
      setIsLookingUpAres(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const result = await registerUserAction(formData)
    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.agencyWarning) {
      router.push(`/overeni-emailu?upozorneni=${encodeURIComponent(result.agencyWarning)}`)
      return
    }
    router.push('/overeni-emailu')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrace</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Jméno a příjmení</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+420 777 123 456"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Heslo</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-heading">Jsem</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accountType"
                value="soukromnik"
                checked={accountType === 'soukromnik'}
                onChange={() => setAccountType('soukromnik')}
              />
              Soukromá osoba
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accountType"
                value="profesional"
                checked={accountType === 'profesional'}
                onChange={() => setAccountType('profesional')}
              />
              Realitní kancelář / makléř
            </label>
          </fieldset>

          {accountType === 'profesional' ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-alt p-3">
              <Label htmlFor="ico">IČO realitní kanceláře</Label>
              <div className="flex gap-2">
                <Input
                  id="ico"
                  name="ico"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  value={ico}
                  onChange={(event) => {
                    setIco(event.target.value.replace(/\D/g, ''))
                    setAresPreview(null)
                    setAresError(null)
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLookingUpAres || ico.length !== 8}
                  onClick={lookupAres}
                >
                  {isLookingUpAres ? 'Hledám…' : 'Načíst z ARES'}
                </Button>
              </div>
              {aresPreview ? (
                <p className="text-sm text-success">
                  {aresPreview.name}
                  {formatAresAddress(aresPreview) ? `, ${formatAresAddress(aresPreview)}` : ''}
                </p>
              ) : null}
              {aresError ? <p className="text-sm text-destructive">{aresError}</p> : null}
              <p className="text-xs text-muted-foreground">
                Adresu, DIČ a další údaje doplníme automaticky z registru ARES.
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Zakládám účet…' : 'Vytvořit účet zdarma'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Registrací souhlasíte s{' '}
            <Link href="/podminky" className="underline">
              podmínkami služby
            </Link>
            .
          </p>
          <p className="text-sm">
            Už máte účet?{' '}
            <Link href="/prihlaseni" className="text-brand-500 hover:text-primary">
              Přihlaste se
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
