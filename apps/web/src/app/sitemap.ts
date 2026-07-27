import { loadEnv } from '@rocket/config'
import { getDb, listings, municipalities } from '@rocket/db'
import { CATEGORIES_MAIN } from '@rocket/shared'
import { desc, eq } from 'drizzle-orm'
import type { MetadataRoute } from 'next'

const LISTING_LIMIT = 5000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = loadEnv().APP_URL
  const db = getDb()

  const activeListings = await db
    .select({ slug: listings.slug, updatedAt: listings.updatedAt })
    .from(listings)
    .where(eq(listings.status, 'active'))
    .orderBy(desc(listings.publishedAt))
    .limit(LISTING_LIMIT)

  const municipalityRows = await db.select({ slug: municipalities.slug }).from(municipalities)

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/hypotecni-kalkulacka`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/realitni-kancelare`, changeFrequency: 'daily', priority: 0.6 },
  ]

  const landingPages: MetadataRoute.Sitemap = ['prodej', 'pronajem'].flatMap((transaction) =>
    CATEGORIES_MAIN.flatMap((category) => [
      {
        url: `${baseUrl}/${transaction}/${category.slug}`,
        changeFrequency: 'hourly' as const,
        priority: 0.9,
      },
      ...municipalityRows.map((municipality) => ({
        url: `${baseUrl}/${transaction}/${category.slug}/${municipality.slug}`,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
    ]),
  )

  const listingPages: MetadataRoute.Sitemap = activeListings.map((listing) => ({
    url: `${baseUrl}/detail/${listing.slug}`,
    lastModified: listing.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticPages, ...landingPages, ...listingPages]
}
