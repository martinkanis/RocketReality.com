'use server'

import { isValidIban } from '@rocket/core'
import { agencies, getDb, users } from '@rocket/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/require-user'
import { getAgencyMembership } from '@/lib/session'

/** Uloží jméno a telefon přihlášeného uživatele. */
export async function updateProfile(name: string, phone: string): Promise<void> {
  const user = await requireUser()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Jméno nesmí být prázdné')
  }
  const trimmedPhone = phone.trim()
  await getDb()
    .update(users)
    .set({ name: trimmedName, phone: trimmedPhone || null })
    .where(eq(users.id, user.id))
  revalidatePath('/muj-ucet/nastaveni')
}

export interface PayoutIbanResult {
  ok: boolean
  error?: string
}

/**
 * Uloží účet pro výplatu odměny z launch akce. Alternativa k platebnímu QR
 * ve fotce — kancelář ho ve svém exportu nemá jak poslat.
 */
export async function updatePayoutIban(iban: string): Promise<PayoutIbanResult> {
  const user = await requireUser()
  const normalized = iban.replace(/\s+/g, '').toUpperCase()

  if (normalized && !isValidIban(normalized)) {
    return { ok: false, error: 'Zadané číslo účtu není platný IBAN' }
  }

  const membership = await getAgencyMembership(user.id)
  if (membership) {
    await getDb()
      .update(agencies)
      .set({ payoutIban: normalized || null })
      .where(eq(agencies.id, membership.agencyId))
  } else {
    await getDb()
      .update(users)
      .set({ payoutIban: normalized || null })
      .where(eq(users.id, user.id))
  }

  revalidatePath('/muj-ucet/nastaveni')
  return { ok: true }
}
