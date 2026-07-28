import { AresLookupError, lookupAresCompany } from '@rocket/core'
import { NextResponse } from 'next/server'

/** Náhled firmy z ARES pro registrační formulář — bez autentizace, jen ke zobrazení. */
export async function GET(_request: Request, { params }: { params: Promise<{ ico: string }> }) {
  const { ico } = await params
  try {
    const company = await lookupAresCompany(ico)
    return NextResponse.json({
      name: company.name,
      street: company.street,
      city: company.city,
      postalCode: company.postalCode,
    })
  } catch (error) {
    const message = error instanceof AresLookupError ? error.message : 'Vyhledání v ARES selhalo'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
