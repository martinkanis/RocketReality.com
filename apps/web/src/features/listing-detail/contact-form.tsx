'use client'

import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { submitContactMessage } from './actions'

interface ContactFormProps {
  listingId: string
  listingTitle: string
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

/** Kontaktní formulář na detailu inzerátu — odesílá server action s honeypotem. */
export function ContactForm({ listingId, listingTitle }: ContactFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [hasConsent, setHasConsent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const result = await submitContactMessage({
      listingId,
      name: formValue(formData, 'name'),
      email: formValue(formData, 'email'),
      phone: formValue(formData, 'phone') || undefined,
      message: formValue(formData, 'message'),
      consent: hasConsent,
      web: formValue(formData, 'web'),
    })
    setIsSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setIsSent(true)
  }

  if (isSent) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-success-bg p-4 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Zpráva byla odeslána. Inzerent se vám ozve na uvedený kontakt.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-name">Jméno</Label>
        <Input id="contact-name" name="name" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-email">E-mail</Label>
        <Input id="contact-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-phone">Telefon (nepovinné)</Label>
        <Input id="contact-phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">Zpráva</Label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          defaultValue={`Dobrý den,\nmám zájem o „${listingTitle}“. Prosím o kontakt.`}
          className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {/* Honeypot — lidé pole nevidí, boti ho vyplní. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-web">Web</label>
        <input id="contact-web" name="web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={hasConsent}
          onCheckedChange={(state) => setHasConsent(state === true)}
          aria-label="Souhlas se zpracováním osobních údajů"
        />
        <span>
          Souhlasím se{' '}
          <Link href="/ochrana-osobnich-udaju" className="text-brand-500 hover:text-primary">
            zpracováním osobních údajů
          </Link>{' '}
          za účelem vyřízení dotazu.
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting || !hasConsent}>
        {isSubmitting ? 'Odesílám…' : 'Odeslat zprávu'}
      </Button>
    </form>
  )
}
