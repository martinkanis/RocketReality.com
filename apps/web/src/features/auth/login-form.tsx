'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const { error: signInError } = await authClient.signIn.email({
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    })
    setIsSubmitting(false)
    if (signInError) {
      setError(
        signInError.status === 403
          ? 'Nejdříve prosím potvrďte svou e-mailovou adresu — odkaz jsme poslali e-mailem.'
          : 'Nesprávný e-mail nebo heslo.',
      )
      return
    }
    router.push('/muj-ucet')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Přihlášení</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Přihlašuji…' : 'Přihlásit se'}
          </Button>
          <div className="flex justify-between text-sm">
            <Link href="/zapomenute-heslo" className="text-brand-500 hover:text-primary">
              Zapomenuté heslo
            </Link>
            <Link href="/registrace" className="text-brand-500 hover:text-primary">
              Vytvořit účet
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
