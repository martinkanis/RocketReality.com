'use server'

import { auth } from '@rocket/auth'
import { AresLookupError, lookupAresCompany } from '@rocket/core'
import { agencies, agencyMembers, getDb } from '@rocket/db'
import { slugify } from '@rocket/shared'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { z } from 'zod'

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Zadejte jméno a příjmení'),
    email: z.email('Zadejte platný e-mail'),
    password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků'),
    phone: z.string().trim().min(9, 'Zadejte platné telefonní číslo'),
    accountType: z.enum(['soukromnik', 'profesional']),
    ico: z
      .string()
      .trim()
      .nullish()
      .transform((value) => value || undefined),
  })
  .refine((data) => data.accountType !== 'profesional' || /^\d{8}$/.test(data.ico ?? ''), {
    message: 'Zadejte platné 8místné IČO realitní kanceláře',
    path: ['ico'],
  })

export type RegisterResult =
  | { ok: true; agencyWarning: string | null }
  | { ok: false; error: string; field?: string }

/** Vytvoří firmu z ARES (nebo najde existující dle IČO) a připojí uživatele jako majitele. */
async function attachAgencyByIco(ico: string, userId: string): Promise<string | null> {
  const db = getDb()
  const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ico, ico))

  let agencyId: string
  if (existing) {
    agencyId = existing.id
  } else {
    let company: Awaited<ReturnType<typeof lookupAresCompany>>
    try {
      company = await lookupAresCompany(ico)
    } catch (error) {
      const message = error instanceof AresLookupError ? error.message : 'Vyhledání v ARES selhalo'
      return `Účet byl vytvořen, ale firmu se nepodařilo načíst z ARES (${message}). Doplňte ji prosím v nastavení kanceláře.`
    }

    const [inserted] = await db
      .insert(agencies)
      .values({
        name: company.name,
        slug: slugify(company.name),
        ico: company.ico,
        dic: company.dic,
        street: company.street,
        city: company.city,
        postalCode: company.postalCode,
        aresData: company.raw,
        aresSyncedAt: new Date(),
      })
      .onConflictDoNothing({ target: agencies.ico })
      .returning({ id: agencies.id })

    if (!inserted) {
      // Souběh — mezitím vznikla stejná firma jiným požadavkem.
      const [raceWinner] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ico, ico))
      if (!raceWinner) return 'Účet byl vytvořen, ale založení firmy selhalo. Zkuste to prosím v nastavení kanceláře.'
      agencyId = raceWinner.id
    } else {
      agencyId = inserted.id
    }
  }

  await db
    .insert(agencyMembers)
    .values({ agencyId, userId, role: 'owner', acceptedAt: new Date() })
    .onConflictDoNothing()
  return null
}

export async function registerUserAction(formData: FormData): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    phone: formData.get('phone'),
    accountType: formData.get('accountType'),
    ico: formData.get('ico'),
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue?.message ?? 'Neplatný formulář', field: issue?.path[0] as string }
  }
  const { name, email, password, phone, accountType, ico } = parsed.data

  let userId: string
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password, phone, accountType },
      headers: await headers(),
    })
    userId = result.user.id
  } catch {
    return { ok: false, error: 'Účet s tímto e-mailem už existuje', field: 'email' }
  }

  let agencyWarning: string | null = null
  if (accountType === 'profesional' && ico) {
    agencyWarning = await attachAgencyByIco(ico, userId)
  }
  return { ok: true, agencyWarning }
}
