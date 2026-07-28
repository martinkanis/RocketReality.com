'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { formString } from '@/lib/form'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    const password = formString(formData, 'password')
    if (password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků.')
      return
    }
    setIsSubmitting(true)
    const { error: signUpError } = await authClient.signUp.email({
      name: formString(formData, 'name'),
      email: formString(formData, 'email'),
      password,
      // Doplňkové pole better-auth (additionalFields) — typ klienta ho nezná.
      ...({ accountType: formString(formData, 'accountType') } as Record<string, string>),
    })
    setIsSubmitting(false)
    if (signUpError) {
      setError(
        signUpError.status === 422
          ? 'Účet s tímto e-mailem už existuje.'
          : 'Registrace se nepodařila, zkuste to prosím znovu.',
      )
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
              <input type="radio" name="accountType" value="soukromnik" defaultChecked />
              Soukromá osoba
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="accountType" value="profesional" />
              Realitní kancelář / makléř
            </label>
          </fieldset>
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
