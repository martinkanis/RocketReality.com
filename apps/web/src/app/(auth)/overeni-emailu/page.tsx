import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Ověření e-mailu' }

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zkontrolujte svou schránku</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          Poslali jsme vám e-mail s odkazem pro potvrzení adresy. Bez potvrzení se nelze přihlásit.
        </p>
        <p className="text-muted-foreground">
          E-mail nedorazil? Zkontrolujte spam, nebo se{' '}
          <Link href="/registrace" className="underline">
            zaregistrujte znovu
          </Link>
          .
        </p>
        <Link href="/prihlaseni" className="text-brand-500 hover:text-primary">
          Přejít na přihlášení
        </Link>
      </CardContent>
    </Card>
  )
}
