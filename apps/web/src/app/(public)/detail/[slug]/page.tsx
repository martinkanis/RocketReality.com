import { loadEnv } from '@rocket/config'
import { incrementViewCount, recordListingView } from '@rocket/core'
import {
  CATEGORY_MAIN_BY_ID,
  KRAJ_LABELS,
  LISTING_STATUS_LABELS,
  PUBLIC_ARCHIVE_REASONS,
  formatPrice,
} from '@rocket/shared'
import { House } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/listing/breadcrumbs'
import { ListingCard } from '@/components/listing/listing-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ListingActionBar } from '@/features/listing-detail/action-bar'
import { ContactForm } from '@/features/listing-detail/contact-form'
import { ListingGallery, type GalleryImage } from '@/features/listing-detail/gallery'
import { MortgageCalculator } from '@/features/listing-detail/mortgage-calculator'
import { ParametersTable } from '@/features/listing-detail/parameters-table'
import {
  getListingDetailBySlug,
  getSimilarListings,
  type ListingDetail,
  type ListingRow,
} from '@/features/listing-detail/queries'
import { ShowPhoneButton } from '@/features/listing-detail/show-phone-button'
import {
  buildBreadcrumbJsonLd,
  buildListingJsonLd,
} from '@/features/listing-detail/structured-data'
import { buildSearchHeading } from '@/features/search/labels'
import { buildSearchPath } from '@/features/search/url'
import { ViewDurationTracker } from '@/features/analytics/view-duration-tracker'
import { archiveVisibleSince } from '@/features/archive/queries'
import { createLogger } from '@/lib/logger'
import { mediaUrl, mediaVariantUrl } from '@/lib/media'
import { isFavorite as isListingFavorite } from '@/features/favorites/actions'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

const logger = createLogger('listing-detail-page')

const PUBLICLY_VISIBLE_STATUSES = ['active', 'paused', 'expired'] as const
const INACTIVE_BANNER_STATUSES = ['paused', 'expired'] as const

/** Prodaná/pronajatá nabídka zůstává veřejná po dobu archivu — viz sekce /archiv. */
function isPubliclyArchived(listing: ListingRow): boolean {
  if (listing.status !== 'archived' || listing.deletedAt) return false
  const isPublicReason = PUBLIC_ARCHIVE_REASONS.some((reason) => reason === listing.archiveReason)
  if (!isPublicReason || !listing.statusChangedAt) return false
  return listing.statusChangedAt >= archiveVisibleSince()
}

const SIMILAR_LISTINGS_COUNT = 4
const DEFAULT_DOWN_PAYMENT_RATIO = 0.2
const DEFAULT_MORTGAGE_RATE_PERCENT = 4.9
const DEFAULT_MORTGAGE_YEARS = 30
const METADATA_DESCRIPTION_LENGTH = 160

interface ListingDetailPageProps {
  params: Promise<{ slug: string }>
}

const priceLineFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 })

function isPubliclyVisible(listing: ListingRow): boolean {
  if (listing.deletedAt) return false
  return (
    PUBLICLY_VISIBLE_STATUSES.some((status) => status === listing.status) ||
    isPubliclyArchived(listing)
  )
}

/** Ulice podle nastavené viditelnosti adresy (přesná / jen ulice / jen obec). */
function visibleStreetLine(listing: ListingRow): string | null {
  if (listing.addressVisibility === 'obec') return null
  const parts =
    listing.addressVisibility === 'presna'
      ? [listing.street, listing.streetNumber]
      : [listing.street]
  return parts.filter(Boolean).join(' ') || null
}

function buildGalleryImages(detail: ListingDetail): GalleryImage[] {
  return detail.media.map((media) => ({
    src: mediaVariantUrl(media.storageKey, media.variants, 'detail'),
    fullSrc: mediaUrl(media.storageKey),
    alt: media.alt ?? detail.listing.title,
  }))
}

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const detail = await getListingDetailBySlug(slug)
  if (!detail || !isPubliclyVisible(detail.listing)) return {}
  const description = detail.listing.description
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, METADATA_DESCRIPTION_LENGTH)
  const [cover] = buildGalleryImages(detail)
  return {
    title: detail.listing.title,
    description,
    openGraph: {
      title: detail.listing.title,
      description,
      ...(cover ? { images: [{ url: cover.src }] } : {}),
    },
  }
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { slug } = await params
  const detail = await getListingDetailBySlug(slug)
  if (!detail) notFound()
  const { listing } = detail

  let isOwnerPreview = false
  let isAdminPreview = false
  if (!isPubliclyVisible(listing)) {
    const user = await getSessionUser()
    if (user?.id === listing.ownerUserId) {
      isOwnerPreview = true
    } else if (user?.isSuperadmin) {
      // Admin potřebuje dohledat i koncept, smazaný nebo jinak neveřejný inzerát
      // (např. proklikem z historie importů) — bez možnosti ho odsud kontaktovat.
      isAdminPreview = true
    } else {
      notFound()
    }
  }
  const isPreview = isOwnerPreview || isAdminPreview

  const isArchived = !isPreview && isPubliclyArchived(listing)

  // Id návštěvy zná jen tento render — klient jím po odchodu doplní délku návštěvy.
  const viewId = isPreview ? null : crypto.randomUUID()

  if (viewId) {
    // Fire-and-forget — statistiky nesmí zdržet ani shodit render.
    incrementViewCount(listing.id).catch((error: unknown) => {
      logger.error({ err: error, listingId: listing.id }, 'Navýšení počtu zobrazení selhalo')
    })
    recordListingView(viewId, listing.id).catch((error: unknown) => {
      logger.error({ err: error, listingId: listing.id }, 'Záznam návštěvy inzerátu selhal')
    })
  }

  const appUrl = loadEnv().APP_URL
  const listingUrl = `${appUrl}/detail/${listing.slug}`
  const galleryImages = buildGalleryImages(detail)
  const similarListings = await getSimilarListings(detail, SIMILAR_LISTINGS_COUNT)

  const sessionUser = await getSessionUser()
  const isFavorite = sessionUser ? await isListingFavorite(listing.id) : null

  const category = CATEGORY_MAIN_BY_ID.get(listing.categoryMainId)
  const categoryCrumb = category
    ? {
        label: buildSearchHeading({
          transaction: listing.transaction,
          categorySlug: category.slug,
        }),
        href: buildSearchPath({
          transaction: listing.transaction,
          categorySlug: category.slug,
        }),
      }
    : null
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Úvod', href: '/' },
    ...(categoryCrumb ? [categoryCrumb] : []),
    { label: listing.title },
  ]

  const streetLine = visibleStreetLine(listing)
  const headerLocation = [streetLine, detail.municipalityName, `okres ${detail.districtName}`]
    .filter(Boolean)
    .join(', ')
  const fullLocation = [
    streetLine,
    listing.municipalityPart,
    detail.municipalityName,
    `okres ${detail.districtName}`,
    KRAJ_LABELS[listing.kraj],
  ]
    .filter(Boolean)
    .join(', ')

  const showMortgageCalculator =
    listing.transaction === 'prodej' && listing.priceAmount !== null && !listing.priceHidden
  const defaultDownPayment = Math.round((listing.priceAmount ?? 0) * DEFAULT_DOWN_PAYMENT_RATIO)

  const jsonLd = [
    buildListingJsonLd(
      detail,
      listingUrl,
      galleryImages.map((image) => image.fullSrc),
    ),
    buildBreadcrumbJsonLd([
      { name: 'Úvod', url: appUrl },
      ...(categoryCrumb
        ? [{ name: categoryCrumb.label, url: `${appUrl}${categoryCrumb.href}` }]
        : []),
      { name: listing.title, url: listingUrl },
    ]),
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      {viewId ? <ViewDurationTracker viewId={viewId} /> : null}
      <Breadcrumbs items={breadcrumbItems} />
      {INACTIVE_BANNER_STATUSES.some((status) => status === listing.status) && (
        <div className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
          Inzerát již není aktivní.
        </div>
      )}
      {isArchived && (
        <div className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
          Archivní nabídka —{' '}
          {listing.archiveReason === 'pronajato' ? 'nemovitost je pronajatá' : 'nemovitost je prodaná'}
          . Zobrazujeme ji pro porovnání cen v lokalitě.
        </div>
      )}
      {isOwnerPreview && (
        <div className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm font-medium text-info">
          Náhled inzerátu — stav: {LISTING_STATUS_LABELS[listing.status]}. Inzerát není veřejně
          dostupný.
        </div>
      )}
      {isAdminPreview && (
        <div className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm font-medium text-info">
          Admin náhled — stav: {LISTING_STATUS_LABELS[listing.status]}
          {listing.deletedAt ? ' (smazán)' : ''}. Inzerát není veřejně dostupný.
        </div>
      )}
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          {galleryImages.length > 0 ? (
            <ListingGallery images={galleryImages} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-linear-to-br from-brand-100 to-brand-200">
              <House className="size-16 text-brand-400" aria-hidden />
            </div>
          )}
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">{listing.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{headerLocation}</p>
              </div>
              <div className="flex items-center gap-2">
                {isFavorite !== null && (
                  <FavoriteButton listingId={listing.id} isFavorite={isFavorite} variant="row" />
                )}
                <ListingActionBar />
              </div>
            </div>
            <div>
              <p className="text-3xl font-semibold text-brand-500">
                {formatPrice({
                  amount: listing.priceAmount,
                  currency: listing.priceCurrency,
                  unit: listing.priceUnit,
                  hidden: listing.priceHidden,
                })}
              </p>
              {listing.priceNote && (
                <p className="mt-1 text-sm text-muted-foreground">{listing.priceNote}</p>
              )}
              {listing.transaction === 'pronajem' && listing.monthlyFees !== null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  + poplatky {priceLineFormatter.format(listing.monthlyFees)} Kč
                </p>
              )}
              {listing.transaction === 'pronajem' && listing.deposit !== null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  vratná kauce {priceLineFormatter.format(listing.deposit)} Kč
                </p>
              )}
            </div>
          </header>
          <section aria-label="Parametry nemovitosti">
            <h2 className="mb-3 text-xl font-semibold">Parametry</h2>
            <ParametersTable listing={listing} />
          </section>
          {listing.description && (
            <section aria-label="Popis nemovitosti">
              <h2 className="mb-3 text-xl font-semibold">Popis</h2>
              <div className="flex flex-col gap-3">
                {listing.description
                  .split(/\n+/)
                  .filter((paragraph) => paragraph.trim())
                  .map((paragraph, index) => (
                    <p key={index} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
              </div>
            </section>
          )}
          <section aria-label="Lokalita">
            <h2 className="mb-3 text-xl font-semibold">Lokalita</h2>
            <p className="leading-relaxed">{fullLocation}</p>
          </section>
        </div>
        <aside className="flex flex-col gap-6 print:hidden">
          {isArchived ? (
            <ArchivedNotice listing={listing} />
          ) : isAdminPreview ? (
            <AdminPreviewNotice listing={listing} />
          ) : (
            <AdvertiserCard detail={detail} />
          )}
          {showMortgageCalculator && listing.priceAmount !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Hypoteční kalkulačka</CardTitle>
              </CardHeader>
              <CardContent>
                <MortgageCalculator
                  price={listing.priceAmount}
                  defaultDownPayment={defaultDownPayment}
                  defaultRatePercent={DEFAULT_MORTGAGE_RATE_PERCENT}
                  defaultYears={DEFAULT_MORTGAGE_YEARS}
                />
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
      {similarListings.length > 0 && (
        <section aria-label="Podobné inzeráty" className="mt-12 print:hidden">
          <h2 className="mb-4 text-xl font-semibold">Podobné inzeráty</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarListings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** Místo kontaktu na inzerenta — u archivované nabídky nemá smysl psát dotaz. */
function ArchivedNotice({ listing }: { listing: ListingRow }) {
  const reasonLabel =
    listing.archiveReason === 'pronajato' ? 'pronajata' : ('prodána' as const)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nabídka je uzavřená</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="leading-relaxed text-muted-foreground">
          Tato nemovitost byla {reasonLabel}
          {listing.statusChangedAt ? ` ${listing.statusChangedAt.toLocaleDateString('cs-CZ')}` : ''}.
          Necháváme ji v archivu pro porovnání cen, inzerenta už ale kontaktovat nelze.
        </p>
        <Link href="/archiv" className="font-medium text-brand-500 hover:text-primary">
          Další nabídky v archivu
        </Link>
        <Link href="/prodej/byty" className="font-medium text-brand-500 hover:text-primary">
          Prohlédnout aktuální nabídku
        </Link>
      </CardContent>
    </Card>
  )
}

/** Admin náhled neveřejného inzerátu (koncept, smazaný…) — bez kontaktu na inzerenta. */
function AdminPreviewNotice({ listing }: { listing: ListingRow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin náhled</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="leading-relaxed text-muted-foreground">
          Kontaktní formulář je v náhledu skrytý. Schválení, pozastavení nebo smazání inzerátu
          proveďte v administraci.
        </p>
        <Link
          href={`/admin/inzeraty?hledat=${encodeURIComponent(listing.title)}`}
          className="font-medium text-brand-500 hover:text-primary"
        >
          Spravovat v administraci
        </Link>
      </CardContent>
    </Card>
  )
}

function AdvertiserCard({ detail }: { detail: ListingDetail }) {
  const { agency } = detail
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontaktovat inzerenta</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {agency ? (
          <div className="flex items-center gap-3">
            {agency.logoKey && (
              <img
                src={mediaUrl(agency.logoKey)}
                alt={`Logo ${agency.name}`}
                className="size-12 rounded-sm border border-border object-contain"
              />
            )}
            <div>
              <Link
                href={`/realitni-kancelar/${agency.slug}`}
                className="font-medium text-brand-500 hover:text-primary"
              >
                {agency.name}
              </Link>
              <p className="text-xs text-muted-foreground">Realitní kancelář</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-medium text-heading">{detail.ownerName}</p>
            <p className="text-xs text-muted-foreground">Soukromá osoba</p>
          </div>
        )}
        <ShowPhoneButton listingId={detail.listing.id} />
        <Separator />
        <ContactForm listingId={detail.listing.id} listingTitle={detail.listing.title} />
      </CardContent>
    </Card>
  )
}
