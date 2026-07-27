import { loadEnv } from '@rocket/config'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = loadEnv().APP_URL
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/muj-ucet', '/admin', '/api/', '/vlozit-inzerat'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
