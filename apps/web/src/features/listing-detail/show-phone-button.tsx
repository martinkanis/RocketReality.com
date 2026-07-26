'use client'

import { Phone } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { revealListingPhone } from './actions'

type PhoneState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'revealed'; phone: string }
  | { status: 'unavailable' }

/** Telefon inzerenta se načítá až po kliknutí, aby nebyl v HTML pro scrapery. */
export function ShowPhoneButton({ listingId }: { listingId: string }) {
  const [state, setState] = useState<PhoneState>({ status: 'idle' })

  async function handleReveal() {
    setState({ status: 'loading' })
    const { phone } = await revealListingPhone(listingId)
    setState(phone ? { status: 'revealed', phone } : { status: 'unavailable' })
  }

  if (state.status === 'revealed') {
    return (
      <a
        href={`tel:${state.phone.replace(/\s/g, '')}`}
        className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-brand-500 hover:bg-muted"
      >
        <Phone className="size-4" />
        {state.phone}
      </a>
    )
  }
  if (state.status === 'unavailable') {
    return <p className="text-sm text-muted-foreground">Telefon není uveden.</p>
  }
  return (
    <Button variant="outline" onClick={handleReveal} disabled={state.status === 'loading'}>
      <Phone />
      {state.status === 'loading' ? 'Načítám…' : 'Zobrazit telefon'}
    </Button>
  )
}
