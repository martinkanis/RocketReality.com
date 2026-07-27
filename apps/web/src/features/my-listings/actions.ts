'use server'

import { loadEnv } from '@rocket/config'
import { ListingStateError, archiveListing, boostListing, extendListing } from '@rocket/core'
import { getDb, listings } from '@rocket/db'
import { ARCHIVE_REASONS, type ArchiveReason } from '@rocket/shared'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { requireUser } from '@/lib/require-user'

const logger = createLogger('my-listings')

export type ListingActionResult = { ok: true } | { ok: false; error: string }

function parseListingId(listingId: string): string {
  const parsed = z.uuid().safeParse(listingId)
  if (!parsed.success) throw new Error('Neplatné ID inzerátu')
  return parsed.data
}

/** Ověří, že inzerát existuje a patří přihlášenému uživateli. */
async function requireOwnedListing(listingId: string, userId: string) {
  const db = getDb()
  const [listing] = await db
    .select({ id: listings.id, ownerUserId: listings.ownerUserId, status: listings.status })
    .from(listings)
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1)
  if (!listing || listing.ownerUserId !== userId) {
    throw new Error('Inzerát neexistuje nebo vám nepatří')
  }
  return listing
}

function revalidateMyListings(): void {
  revalidatePath('/muj-ucet')
  revalidatePath('/muj-ucet/inzeraty')
}

function returnUrl(): string {
  return `${loadEnv().APP_URL}/muj-ucet/inzeraty`
}

/** Soft delete konceptu — řádek zůstává v DB s nastaveným deletedAt. */
export async function deleteDraftListing(listingId: string): Promise<ListingActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  const listing = await requireOwnedListing(id, user.id)
  if (listing.status !== 'draft') {
    return { ok: false, error: 'Smazat lze jen koncept' }
  }
  await getDb().update(listings).set({ deletedAt: new Date() }).where(eq(listings.id, id))
  revalidateMyListings()
  return { ok: true }
}

/** Topování aktivního inzerátu na 7 dní (přes objednávku, v1 zdarma). */
export async function boostListingAction(listingId: string): Promise<ListingActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedListing(id, user.id)
  try {
    await boostListing(id, returnUrl())
  } catch (error) {
    if (error instanceof ListingStateError) {
      logger.warn({ listingId: id, error: error.message }, 'Topování inzerátu selhalo')
      return { ok: false, error: error.message }
    }
    throw error
  }
  revalidateMyListings()
  return { ok: true }
}

/** Prodloužení aktivního nebo expirovaného inzerátu o 30 dní. */
export async function extendListingAction(listingId: string): Promise<ListingActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedListing(id, user.id)
  try {
    await extendListing(id, returnUrl())
  } catch (error) {
    if (error instanceof ListingStateError) {
      logger.warn({ listingId: id, error: error.message }, 'Prodloužení inzerátu selhalo')
      return { ok: false, error: error.message }
    }
    throw error
  }
  revalidateMyListings()
  return { ok: true }
}

/** Archivace inzerátu s udáním důvodu (prodáno/pronajato/staženo/jiné). */
export async function archiveListingAction(
  listingId: string,
  reason: ArchiveReason,
): Promise<ListingActionResult> {
  const user = await requireUser()
  const id = parseListingId(listingId)
  await requireOwnedListing(id, user.id)
  if (!ARCHIVE_REASONS.includes(reason)) {
    return { ok: false, error: 'Neplatný důvod archivace' }
  }
  try {
    await archiveListing(id, reason)
  } catch (error) {
    if (error instanceof ListingStateError) {
      logger.warn({ listingId: id, error: error.message }, 'Archivace inzerátu selhala')
      return { ok: false, error: error.message }
    }
    throw error
  }
  revalidateMyListings()
  return { ok: true }
}
