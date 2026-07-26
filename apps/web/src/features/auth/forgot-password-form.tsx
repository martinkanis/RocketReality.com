'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function ForgotPasswordForm() {
  const [isSent, setIsSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    await authClient.requestPasswordReset({
      email: String(formData.get('email')),
      redirectTo: '/obnova-hesla',
    })
    // Záměrně nerozlišujeme, zda účet existuje (ochrana proti enumeraci účtů).
    setIsSubmitting(false)
    setIsSent(true)
  }

  if (isSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>E-mail odeslán</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Pokud u nás účet existuje, poslali jsme na něj odkaz pro obnovu hesla.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zapomenuté heslo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Odesílám…' : 'Poslat odkaz pro obnovu'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
