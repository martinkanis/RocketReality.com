import { PRODUCT_CODES } from '@rocket/config'
import { boosts, getDb, listings, moderationCases } from '@rocket/db'
import { buildListingSlug } from '@rocket/shared'
import { and, eq, sql } from 'drizzle-orm'
import { placeOrder } from '../billing/orders'

export class ListingNotFoundError extends Error {
  constructor(id: string) {
    super(`Inzerát '${id}' neexistuje`)
  }
}

export class ListingStateError extends Error {}

type ListingRow = typeof listings.$inferSelect

async function requireListing(id: string): Promise<ListingRow> {
  const db = getDb()
  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1)
  if (!listing || listing.deletedAt) throw new ListingNotFoundError(id)
  return listing
}

/** Po uložení konceptu s vyplněným titulkem dopočítá definitivní slug. */
export async function ensureListingSlug(id: string): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (!listing.slug.startsWith('tmp-')) return
  await db
    .update(listings)
    .set({ slug: buildListingSlug(listing.title, listing.seq) })
    .where(eq(listings.id, id))
}

/**
 * Odeslání inzerátu ke schválení: koncept → objednávka publikace (v1 zdarma,
 * NullProvider ji rovnou zaplatí) → fronta moderace.
 */
export async function submitListingForReview(id: string, returnUrl: string): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'draft' && listing.status !== 'rejected') {
    throw new ListingStateError(`Inzerát ve stavu '${listing.status}' nelze odeslat ke schválení`)
  }

  const { checkout } = await placeOrder({
    userId: listing.ownerUserId,
    agencyId: listing.agencyId,
    listingId: id,
    productCode: PRODUCT_CODES.publikace30d,
    returnUrl,
  })
  if (checkout.status === 'failed') {
    throw new ListingStateError('Objednávku publikace se nepodařilo dokončit')
  }
  // Stav "redirect" nastane až se Stripe providerem — pak se moderace spustí webhoookem po zaplacení.
  if (checkout.status !== 'paid') return

  await ensureListingSlug(id)
  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ status: 'pending_review', statusChangedAt: new Date(), rejectedReason: null })
      .where(eq(listings.id, id))
    await tx.insert(moderationCases).values({ listingId: id })
  })
}

/** Schválení moderátorem → aktivace inzerátu na durationDays produktu publikace. */
export async function approveListing(id: string, moderatorUserId: string): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'pending_review') {
    throw new ListingStateError(`Inzerát ve stavu '${listing.status}' nelze schválit`)
  }
  const now = new Date()
  const validUntil = new Date(now.getTime() + 30 * 24 * 3600 * 1000)
  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ status: 'active', statusChangedAt: now, publishedAt: now, validUntil })
      .where(eq(listings.id, id))
    await tx
      .update(moderationCases)
      .set({ status: 'approved', moderatorUserId, resolvedAt: now })
      .where(and(eq(moderationCases.listingId, id), eq(moderationCases.status, 'pending')))
  })
}

export async function rejectListing(
  id: string,
  moderatorUserId: string,
  reasonCode: (typeof moderationCases.$inferSelect)['reasonCode'],
  note: string,
): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'pending_review') {
    throw new ListingStateError(`Inzerát ve stavu '${listing.status}' nelze zamítnout`)
  }
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ status: 'rejected', statusChangedAt: now, rejectedReason: note })
      .where(eq(listings.id, id))
    await tx
      .update(moderationCases)
      .set({ status: 'rejected', reasonCode, note, moderatorUserId, resolvedAt: now })
      .where(and(eq(moderationCases.listingId, id), eq(moderationCases.status, 'pending')))
  })
}

/** Prodloužení aktivního/expirovaného inzerátu o 30 dní (přes objednávku). */
export async function extendListing(id: string, returnUrl: string): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'active' && listing.status !== 'expired') {
    throw new ListingStateError(`Inzerát ve stavu '${listing.status}' nelze prodloužit`)
  }
  const { checkout, product } = await placeOrder({
    userId: listing.ownerUserId,
    agencyId: listing.agencyId,
    listingId: id,
    productCode: PRODUCT_CODES.prodlouzeni30d,
    returnUrl,
  })
  if (checkout.status !== 'paid') return

  const base =
    listing.status === 'active' && listing.validUntil && listing.validUntil > new Date()
      ? listing.validUntil
      : new Date()
  await db
    .update(listings)
    .set({
      status: 'active',
      statusChangedAt: new Date(),
      validUntil: new Date(base.getTime() + product.durationDays * 24 * 3600 * 1000),
    })
    .where(eq(listings.id, id))
}

/** Topování: zvýhodnění v řazení na 7 dní (přes objednávku, v1 zdarma). */
export async function boostListing(id: string, returnUrl: string): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'active') {
    throw new ListingStateError('Topovat lze jen aktivní inzerát')
  }
  const { checkout, product } = await placeOrder({
    userId: listing.ownerUserId,
    agencyId: listing.agencyId,
    listingId: id,
    productCode: PRODUCT_CODES.top7d,
    returnUrl,
  })
  if (checkout.status !== 'paid') return

  const now = new Date()
  const endsAt = new Date(now.getTime() + product.durationDays * 24 * 3600 * 1000)
  await db.transaction(async (tx) => {
    await tx.insert(boosts).values({ listingId: id, startsAt: now, endsAt })
    await tx.update(listings).set({ toppedUntil: endsAt }).where(eq(listings.id, id))
  })
}

/** Deaktivace inzerentem (prodáno/pronajato/staženo). */
export async function archiveListing(
  id: string,
  reason: NonNullable<ListingRow['archiveReason']>,
): Promise<void> {
  const db = getDb()
  const listing = await requireListing(id)
  if (listing.status !== 'active' && listing.status !== 'paused' && listing.status !== 'expired') {
    throw new ListingStateError(`Inzerát ve stavu '${listing.status}' nelze archivovat`)
  }
  await db
    .update(listings)
    .set({ status: 'archived', archiveReason: reason, statusChangedAt: new Date() })
    .where(eq(listings.id, id))
}

/** Zvýšení počítadla zobrazení detailu (bez čekání na statistiky). */
export async function incrementViewCount(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(listings)
    .set({ viewCount: sql`${listings.viewCount} + 1` })
    .where(eq(listings.id, id))
}
