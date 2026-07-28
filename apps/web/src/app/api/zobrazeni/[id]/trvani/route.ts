import { recordPageViewDuration } from '@rocket/core'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const paramsSchema = z.object({ id: z.uuid() })
const bodySchema = z.object({ durationSeconds: z.number().positive() })

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Přijímá délku návštěvy odeslanou přes navigator.sendBeacon při odchodu ze
 * stránky inzerátu/kanceláře. Bez autentizace — id je náhodné UUID známé jen
 * prohlížeči dané návštěvy, zápis jde jen do už existujícího řádku.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const parsedParams = paramsSchema.safeParse(await params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Neplatné ID zobrazení' }, { status: 400 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 })
  }
  const parsedBody = bodySchema.safeParse(rawBody)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Neplatná délka návštěvy' }, { status: 422 })
  }

  await recordPageViewDuration(parsedParams.data.id, parsedBody.data.durationSeconds)
  return NextResponse.json({ ok: true })
}
