'use server'

import { getDb, users } from '@rocket/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/require-user'

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
