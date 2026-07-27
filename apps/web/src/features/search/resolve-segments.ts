import { districts, getDb, municipalities } from '@rocket/db'
import type { Disposition } from '@rocket/shared'
import { eq } from 'drizzle-orm'
import { cache } from 'react'

import { DISPOSITION_BY_URL_SLUG } from './url'

export interface ResolvedLocation {
  municipalitySlug: string | null
  districtSlug: string | null
  slug: string
  name: string
}

export interface ResolvedSearchSegments {
  disposition: Disposition | null
  location: ResolvedLocation | null
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** Obec má přednost před okresem — slugy se mohou překrývat (např. „benesov"). */
const findLocationBySlug = cache(async (slug: string): Promise<ResolvedLocation | null> => {
  const db = getDb()
  const [municipality] = await db
    .select({ slug: municipalities.slug, name: municipalities.name })
    .from(municipalities)
    .where(eq(municipalities.slug, slug))
    .limit(1)
  if (municipality) {
    return {
      municipalitySlug: municipality.slug,
      districtSlug: null,
      slug: municipality.slug,
      name: municipality.name,
    }
  }
  const [district] = await db
    .select({ slug: districts.slug, name: districts.name })
    .from(districts)
    .where(eq(districts.slug, slug))
    .limit(1)
  if (district) {
    return {
      municipalitySlug: null,
      districtSlug: district.slug,
      slug: district.slug,
      name: district.name,
    }
  }
  return null
})

/**
 * Rozliší volitelné catch-all segmenty výpisu: [dispozice?][lokalita?].
 * Dispozice se rozpoznává jen u bytů; neznámý segment vrací null (→ notFound).
 */
export const resolveSearchSegments = cache(
  async (segments: string[], isByty: boolean): Promise<ResolvedSearchSegments | null> => {
    if (segments.length > 2) return null
    const decoded: string[] = []
    for (const segment of segments) {
      const value = safeDecode(segment)
      if (value === null) return null
      decoded.push(value)
    }
    const [first, second] = decoded

    let disposition: Disposition | null = null
    let locationSegment: string | undefined

    if (first) {
      const dispositionFromSlug = isByty ? DISPOSITION_BY_URL_SLUG.get(first) : undefined
      if (dispositionFromSlug) {
        disposition = dispositionFromSlug
        locationSegment = second
      } else {
        if (second) return null
        locationSegment = first
      }
    }

    let location: ResolvedLocation | null = null
    if (locationSegment) {
      location = await findLocationBySlug(locationSegment)
      if (!location) return null
    }

    return { disposition, location }
  },
)
