import {
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_TYPES,
  OWNERSHIP_TYPES,
  TRANSACTION_TYPES,
} from '@rocket/shared'
import { z } from 'zod'

/**
 * SearchQuery — jediný tvar filtru v celém systému: URL parametry výpisu,
 * uložená hledání (hlídací pes) i SQL dotaz se odvozují z tohoto schématu.
 */
export const searchQuerySchema = z.object({
  transaction: z.enum(TRANSACTION_TYPES),
  categoryMain: z.string().min(1),
  categorySub: z.string().optional(),
  disposition: z.array(z.enum(DISPOSITIONS)).optional(),
  kraj: z.string().optional(),
  district: z.string().optional(),
  municipality: z.string().optional(),
  priceMin: z.number().int().nonnegative().optional(),
  priceMax: z.number().int().nonnegative().optional(),
  areaMin: z.number().int().nonnegative().optional(),
  areaMax: z.number().int().nonnegative().optional(),
  ownership: z.array(z.enum(OWNERSHIP_TYPES)).optional(),
  buildingType: z.array(z.enum(BUILDING_TYPES)).optional(),
  buildingCondition: z.array(z.enum(BUILDING_CONDITIONS)).optional(),
  furnishing: z.array(z.enum(FURNISHING_TYPES)).optional(),
  energyLabelMax: z.enum(ENERGY_LABELS).optional(),
  hasBalcony: z.boolean().optional(),
  hasTerrace: z.boolean().optional(),
  hasCellar: z.boolean().optional(),
  hasElevator: z.boolean().optional(),
  hasGarage: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  fulltext: z.string().max(200).optional(),
  /** Mapa: bounding box [západ, jih, východ, sever]. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  sort: z.enum(['nejnovejsi', 'nejlevnejsi', 'nejdrazsi']).default('nejnovejsi'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(60).default(20),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
export type SearchQueryInput = z.input<typeof searchQuerySchema>

export interface SearchResultItem {
  id: string
  slug: string
  title: string
  transaction: (typeof TRANSACTION_TYPES)[number]
  categoryMainId: number
  disposition: string | null
  priceAmount: number | null
  priceUnit: string
  priceHidden: boolean
  areaUsable: number | null
  areaLand: number | null
  municipalityName: string
  districtName: string
  street: string | null
  lat: number
  lng: number
  isTopped: boolean
  publishedAt: Date | null
  coverPhotoUrl: string | null
}

export interface SearchResult {
  items: SearchResultItem[]
  total: number
  page: number
  pageSize: number
}

/** Port vyhledávání — v1 implementace nad Postgresem, později vyměnitelné za Meilisearch. */
export interface ListingSearchPort {
  search(query: SearchQuery): Promise<SearchResult>
}
