'use server'

import { favorites, getDb, listings } from '@rocket/db'
import { formatPrice } from '@rocket/shared'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/require-user'
import { getSessionUser } from '@/lib/session'

/** Přidá inzerát do oblíbených, nebo ho z nich odebere. Vrací nový stav. */
export async function toggleFavorite(listingId: string): Promise<{ isFavorite: boolean }> {
  const user = await requireUser()
  const db = getDb()
  const ownFavorite = and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId))

  const [existing] = await db
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(ownFavorite)
    .limit(1)

  if (existing) {
    await db.delete(favorites).where(ownFavorite)
    revalidatePath('/muj-ucet/oblibene')
    return { isFavorite: false }
  }

  const [listing] = await db
    .select({
      priceAmount: listings.priceAmount,
      priceCurrency: listings.priceCurrency,
      priceUnit: listings.priceUnit,
      priceHidden: listings.priceHidden,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1)
  if (!listing) {
    throw new Error(`Inzerát ${listingId} neexistuje — nelze uložit do oblíbených`)
  }

  await db
    .insert(favorites)
    .values({
      userId: user.id,
      listingId,
      priceAtSave: formatPrice({
        amount: listing.priceAmount,
        currency: listing.priceCurrency,
        unit: listing.priceUnit,
        hidden: listing.priceHidden,
      }),
    })
    .onConflictDoNothing()
  revalidatePath('/muj-ucet/oblibene')
  return { isFavorite: true }
}

/** Uloží poznámku k oblíbenému inzerátu (prázdná poznámka = smazání). */
export async function updateFavoriteNote(listingId: string, note: string): Promise<void> {
  const user = await requireUser()
  const trimmedNote = note.trim()
  await getDb()
    .update(favorites)
    .set({ note: trimmedNote || null })
    .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)))
  revalidatePath('/muj-ucet/oblibene')
}

/** Zjistí, zda má přihlášený uživatel inzerát v oblíbených (nepřihlášený → false). */
export async function isFavorite(listingId: string): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  const [existing] = await getDb()
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)))
    .limit(1)
  return existing !== undefined
}

/** ID všech oblíbených inzerátů přihlášeného uživatele — pro označení srdíček ve výpisu. */
export async function getFavoriteIds(): Promise<string[]> {
  const user = await getSessionUser()
  if (!user) return []
  const rows = await getDb()
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(eq(favorites.userId, user.id))
  return rows.map((row) => row.listingId)
}
