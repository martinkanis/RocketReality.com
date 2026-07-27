'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { formString } from '@/lib/form'

function ResetPasswordFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setError('Odkaz pro obnovu hesla je neplatný.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const { error: resetError } = await authClient.resetPassword({
      newPassword: formString(formData, 'password'),
      token,
    })
    setIsSubmitting(false)
    if (resetError) {
      setError('Odkaz je neplatný nebo vypršel. Požádejte o nový.')
      return
    }
    router.push('/prihlaseni')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nastavení nového hesla</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nové heslo</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ukládám…' : 'Nastavit heslo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ResetPasswordForm() {
  return (
    <Suspense>
      <ResetPasswordFormInner />
    </Suspense>
  )
}
