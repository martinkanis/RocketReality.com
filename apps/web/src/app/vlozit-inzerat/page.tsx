import { loadEnv } from '@rocket/config'
import { districts, getDb, listingMedia, listings, municipalities } from '@rocket/db'
import { and, desc, eq, isNull } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { listingRowToWizardData } from '@/features/wizard/draft-mapper'
import { ListingWizard } from '@/features/wizard/listing-wizard'
import type { MunicipalityOption, PhotoItem } from '@/features/wizard/types'
import { requireUser } from '@/lib/require-user'

export const metadata: Metadata = { title: 'Vložit inzerát' }

type ListingRow = typeof listings.$inferSelect

/**
 * Načte inzerát k editaci: konkrétní přes ?id= (koncept i zamítnutý),
 * jinak poslední rozpracovaný koncept uživatele.
 */
async function loadEditableListing(
  userId: string,
  requestedId: string | undefined,
): Promise<ListingRow | null> {
  const db = getDb()
  if (requestedId) {
    if (!z.uuid().safeParse(requestedId).success) notFound()
    const [listing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, requestedId),
          eq(listings.ownerUserId, userId),
          isNull(listings.deletedAt),
        ),
      )
      .limit(1)
    if (!listing || (listing.status !== 'draft' && listing.status !== 'rejected')) notFound()
    return listing
  }
  const [latestDraft] = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.ownerUserId, userId),
        eq(listings.status, 'draft'),
        isNull(listings.deletedAt),
      ),
    )
    .orderBy(desc(listings.updatedAt))
    .limit(1)
  return latestDraft ?? null
}

async function loadListingPhotos(listingId: string): Promise<PhotoItem[]> {
  return getDb()
    .select({
      id: listingMedia.id,
      storageKey: listingMedia.storageKey,
      position: listingMedia.position,
    })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, listingId), eq(listingMedia.kind, 'foto')))
    .orderBy(listingMedia.position)
}

interface VlozitInzeratPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function VlozitInzeratPage({ searchParams }: VlozitInzeratPageProps) {
  const user = await requireUser()
  const { id } = await searchParams
  const db = getDb()

  const municipalityOptions: MunicipalityOption[] = await db
    .select({
      id: municipalities.id,
      name: municipalities.name,
      slug: municipalities.slug,
      districtId: municipalities.districtId,
      districtName: districts.name,
    })
    .from(municipalities)
    .innerJoin(districts, eq(municipalities.districtId, districts.id))
    .orderBy(municipalities.name)

  const listing = await loadEditableListing(user.id, id)
  const photos = listing ? await loadListingPhotos(listing.id) : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Vložit inzerát</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Inzerát projde před zveřejněním rychlou kontrolou. Publikace je zdarma.
      </p>
      <ListingWizard
        municipalities={municipalityOptions}
        initialListingId={listing?.id ?? null}
        initialData={listing ? listingRowToWizardData(listing) : null}
        initialPhotos={photos}
        initialStatus={listing ? (listing.status === 'rejected' ? 'rejected' : 'draft') : null}
        rejectedReason={listing?.rejectedReason ?? null}
        mediaBaseUrl={loadEnv().S3_PUBLIC_URL}
      />
    </div>
  )
}
