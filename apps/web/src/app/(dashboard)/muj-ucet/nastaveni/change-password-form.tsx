'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

const MIN_PASSWORD_LENGTH = 8

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const form = event.currentTarget
    const formData = new FormData(form)
    const newPassword = formString(formData, 'newPassword')
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage({
        text: `Nové heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`,
        isError: true,
      })
      return
    }
    if (newPassword !== formString(formData, 'newPasswordConfirm')) {
      setMessage({ text: 'Nová hesla se neshodují.', isError: true })
      return
    }

    setIsSubmitting(true)
    const { error } = await authClient.changePassword({
      currentPassword: formString(formData, 'currentPassword'),
      newPassword,
    })
    setIsSubmitting(false)
    if (error) {
      setMessage({
        text:
          error.status === 400
            ? 'Současné heslo není správné.'
            : 'Heslo se nepodařilo změnit. Zkuste to prosím znovu.',
        isError: true,
      })
      return
    }
    form.reset()
    setMessage({ text: 'Heslo bylo změněno.', isError: false })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Současné heslo</Label>
        <PasswordInput
          id="current-password"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">Nové heslo</Label>
        <PasswordInput id="new-password" name="newPassword" autoComplete="new-password" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password-confirm">Nové heslo znovu</Label>
        <PasswordInput
          id="new-password-confirm"
          name="newPasswordConfirm"
          autoComplete="new-password"
          required
        />
      </div>
      {message ? (
        <p className={`text-sm ${message.isError ? 'text-destructive' : 'text-success'}`}>
          {message.text}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Měním heslo…' : 'Změnit heslo'}
        </Button>
      </div>
    </form>
  )
}
