'use client'

import { Link2, Printer } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

const COPY_FEEDBACK_MS = 2000

/** Sdílení (kopie odkazu) a tisk detailu. Oblíbené doplní jiná fáze. */
export function ListingActionBar() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch {
      // Clipboard API nemusí být dostupná (např. bez HTTPS) — dáme to uživateli vědět.
      setCopyState('failed')
    }
    setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS)
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handleCopyLink}>
        <Link2 />
        {copyState === 'copied' && 'Odkaz zkopírován'}
        {copyState === 'failed' && 'Kopírování se nezdařilo'}
        {copyState === 'idle' && 'Sdílet'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer />
        Tisk
      </Button>
    </div>
  )
}
