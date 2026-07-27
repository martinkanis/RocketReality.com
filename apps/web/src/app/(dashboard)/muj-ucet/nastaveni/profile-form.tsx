'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from './actions'

interface ProfileFormProps {
  defaultName: string
  defaultPhone: string
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function ProfileForm({ defaultName, defaultPhone }: ProfileFormProps) {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      await updateProfile(formString(formData, 'name'), formString(formData, 'phone'))
      setMessage({ text: 'Údaje byly uloženy.', isError: false })
    } catch {
      setMessage({ text: 'Údaje se nepodařilo uložit. Zkuste to prosím znovu.', isError: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Jméno a příjmení</Label>
        <Input id="profile-name" name="name" defaultValue={defaultName} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-phone">Telefon</Label>
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          defaultValue={defaultPhone}
          placeholder="+420 777 123 456"
          autoComplete="tel"
        />
      </div>
      {message ? (
        <p className={`text-sm ${message.isError ? 'text-destructive' : 'text-success'}`}>
          {message.text}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ukládám…' : 'Uložit změny'}
        </Button>
      </div>
    </form>
  )
}
