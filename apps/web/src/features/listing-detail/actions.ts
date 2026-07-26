'use server'

import { loadEnv } from '@rocket/config'
import { agencies, contactMessages, getDb, listings, users } from '@rocket/db'
import { and, count, eq, gte, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'

import { createLogger } from '@/lib/logger'
import { getSessionUser } from '@/lib/session'

import { sendContactMessageNotification } from '@rocket/emails'

const logger = createLogger('listing-detail')

/** Stavy, ve kterých je inzerát veřejně zobrazitelný (aktivní + s bannerem neaktivní). */
const PUBLICLY_VISIBLE_STATUSES = ['active', 'paused', 'expired'] as const

const CONTACT_RATE_LIMIT_PER_HOUR = 5
const HOUR_IN_MS = 60 * 60 * 1000

const contactMessageSchema = z.object({
  listingId: z.uuid(),
  name: z.string().trim().min(2, 'Vyplňte prosím jméno.').max(200),
  email: z.email('Zadejte platný e-mail.'),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10, 'Napište prosím zprávu (alespoň 10 znaků).').max(5000),
  consent: z
    .boolean()
    .refine((value) => value, 'Bez souhlasu se zpracováním údajů nelze zprávu odeslat.'),
  /** Honeypot — skryté pole, které lidé nevyplňují. */
  web: z.string().max(1000).optional(),
})

export type ContactMessageInput = z.input<typeof contactMessageSchema>

export type ContactMessageResult = { ok: true } | { ok: false; error: string }

async function getRequestClientInfo(): Promise<{ ip: string | null; userAgent: string | null }> {
  const headerList = await headers()
  const forwardedFor = headerList.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || null
  return { ip, userAgent: headerList.get('user-agent') }
}

async function isRateLimited(ip: string): Promise<boolean> {
  const db = getDb()
  const oneHourAgo = new Date(Date.now() - HOUR_IN_MS)
  const [row] = await db
    .select({ sent: count() })
    .from(contactMessages)
    .where(and(eq(contactMessages.ip, ip), gte(contactMessages.createdAt, oneHourAgo)))
  return (row?.sent ?? 0) >= CONTACT_RATE_LIMIT_PER_HOUR
}

/** Odeslání dotazu k inzerátu: uloží zprávu a notifikuje vlastníka e-mailem. */
export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<ContactMessageResult> {
  const parsed = contactMessageSchema.safeParse(input)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return { ok: false, error: firstIssue?.message ?? 'Zkontrolujte prosím vyplněné údaje.' }
  }
  const data = parsed.data

  const db = getDb()
  const [listing] = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      ownerEmail: users.email,
    })
    .from(listings)
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .where(and(eq(listings.id, data.listingId), isNull(listings.deletedAt)))
    .limit(1)
  if (!listing || !PUBLICLY_VISIBLE_STATUSES.some((status) => status === listing.status)) {
    return { ok: false, error: 'Inzerát už bohužel není dostupný.' }
  }

  const { ip, userAgent } = await getRequestClientInfo()
  if (ip && (await isRateLimited(ip))) {
    return { ok: false, error: 'Odeslali jste příliš mnoho zpráv. Zkuste to prosím za hodinu.' }
  }

  const honeypotTriggered = Boolean(data.web)
  const sessionUser = await getSessionUser()
  await db.insert(contactMessages).values({
    listingId: listing.id,
    senderUserId: sessionUser?.id ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    message: data.message,
    ip,
    userAgent,
    honeypotTriggered,
    spamScore: honeypotTriggered ? 100 : 0,
    consentAt: new Date(),
  })

  // Bot chycený honeypotem dostane „úspěch", ale vlastníka neobtěžujeme e-mailem.
  if (honeypotTriggered) return { ok: true }

  try {
    await sendContactMessageNotification({
      to: listing.ownerEmail,
      listingTitle: listing.title,
      listingUrl: `${loadEnv().APP_URL}/detail/${listing.slug}`,
      senderName: data.name,
      senderEmail: data.email,
      senderPhone: data.phone || undefined,
      message: data.message,
    })
  } catch (error) {
    // Selhání e-mailu nesmí shodit odeslání — zpráva je uložená a viditelná v administraci.
    logger.error({ err: error, listingId: listing.id }, 'Notifikace o dotazu k inzerátu selhala')
  }

  return { ok: true }
}

/** Vrátí telefon inzerenta až po kliknutí — číslo tak není v HTML pro scrapery. */
export async function revealListingPhone(listingId: string): Promise<{ phone: string | null }> {
  const parsedId = z.uuid().safeParse(listingId)
  if (!parsedId.success) return { phone: null }

  const db = getDb()
  const [row] = await db
    .select({ status: listings.status, ownerPhone: users.phone, agencyPhone: agencies.phone })
    .from(listings)
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .leftJoin(agencies, eq(listings.agencyId, agencies.id))
    .where(and(eq(listings.id, parsedId.data), isNull(listings.deletedAt)))
    .limit(1)
  if (!row || !PUBLICLY_VISIBLE_STATUSES.some((status) => status === row.status)) {
    return { phone: null }
  }
  return { phone: row.agencyPhone ?? row.ownerPhone ?? null }
}
