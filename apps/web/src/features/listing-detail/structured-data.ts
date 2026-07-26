import type { ListingDetail } from './queries'

export interface BreadcrumbJsonLdItem {
  name: string
  url?: string
}

/** JSON-LD BreadcrumbList pro detail inzerátu. */
export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}

/** JSON-LD RealEstateListing — jen skutečně vyplněná pole. */
export function buildListingJsonLd(
  detail: ListingDetail,
  listingUrl: string,
  photoUrls: string[],
): Record<string, unknown> {
  const { listing } = detail
  const streetAddress = [listing.street, listing.streetNumber].filter(Boolean).join(' ')
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    url: listingUrl,
    ...(listing.description
      ? { description: listing.description.replace(/\s+/g, ' ').trim().slice(0, 300) }
      : {}),
    ...(listing.publishedAt ? { datePosted: listing.publishedAt.toISOString() } : {}),
    ...(photoUrls.length > 0 ? { image: photoUrls } : {}),
    ...(listing.priceAmount !== null && !listing.priceHidden
      ? {
          offers: {
            '@type': 'Offer',
            price: listing.priceAmount,
            priceCurrency: listing.priceCurrency,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(streetAddress ? { streetAddress } : {}),
      addressLocality: detail.municipalityName,
      addressRegion: detail.districtName,
      ...(listing.postalCode ? { postalCode: listing.postalCode } : {}),
      addressCountry: 'CZ',
    },
    ...(listing.areaUsable !== null
      ? {
          floorSize: {
            '@type': 'QuantitativeValue',
            value: listing.areaUsable,
            unitCode: 'MTK',
          },
        }
      : {}),
  }
}
