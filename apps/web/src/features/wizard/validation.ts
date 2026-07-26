import type { listings } from '@rocket/db'
import {
  ADDRESS_VISIBILITIES,
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  CATEGORY_BYTY_ID,
  DISPOSITIONS,
  ENERGY_LABELS,
  FURNISHING_TYPES,
  OWNERSHIP_TYPES,
  TRANSACTION_TYPES,
} from '@rocket/shared'
import { z } from 'zod'
import {
  CATEGORY_POZEMKY_ID,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  type SubmitErrorItem,
} from './types'

type ListingRow = typeof listings.$inferSelect

const optionalArea = z.number().positive().max(1_000_000).nullable()

const utilityFlagsSchema = z.object({
  elektrina: z.boolean(),
  voda: z.boolean(),
  plyn: z.boolean(),
  kanalizace: z.boolean(),
})

/** Validace payloadu konceptu na hranici server action — klientu se nevěří. */
export const draftPayloadSchema = z.object({
  transaction: z.enum(TRANSACTION_TYPES),
  categoryMainId: z.number().int().min(1).max(5),
  categorySubId: z.number().int().positive().nullable(),
  disposition: z.enum(DISPOSITIONS).nullable(),
  municipalityId: z.number().int().positive().nullable(),
  street: z.string().max(200).nullable(),
  streetNumber: z.string().max(20).nullable(),
  addressVisibility: z.enum(ADDRESS_VISIBILITIES),
  areaUsable: optionalArea,
  areaBuiltUp: optionalArea,
  areaLand: optionalArea,
  areaGarden: optionalArea,
  floorNumber: z.number().int().min(-5).max(100).nullable(),
  floorsTotal: z.number().int().min(1).max(100).nullable(),
  ownership: z.enum(OWNERSHIP_TYPES).nullable(),
  buildingType: z.enum(BUILDING_TYPES).nullable(),
  buildingCondition: z.enum(BUILDING_CONDITIONS).nullable(),
  energyLabel: z.enum(ENERGY_LABELS),
  hasBalcony: z.boolean(),
  balconyArea: optionalArea,
  hasTerrace: z.boolean(),
  terraceArea: optionalArea,
  hasLoggia: z.boolean(),
  loggiaArea: optionalArea,
  hasCellar: z.boolean(),
  cellarArea: optionalArea,
  hasElevator: z.boolean(),
  hasGarage: z.boolean(),
  hasParking: z.boolean(),
  barrierFree: z.boolean(),
  utilities: utilityFlagsSchema.nullable(),
  furnishing: z.enum(FURNISHING_TYPES).nullable(),
  monthlyFees: z.number().nonnegative().nullable(),
  deposit: z.number().nonnegative().nullable(),
  availableFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  title: z.string().max(MAX_TITLE_LENGTH),
  description: z.string().max(20_000),
  priceAmount: z.number().positive().max(10_000_000_000).nullable(),
  priceNote: z.string().max(500).nullable(),
  priceHidden: z.boolean(),
})

export type ParsedDraftPayload = z.infer<typeof draftPayloadSchema>

/**
 * Kontrola povinných polí před odesláním ke schválení. Vrací chyby s číslem
 * kroku průvodce, aby je klient uměl zobrazit u správného místa.
 */
export function validateListingForSubmit(listing: ListingRow): SubmitErrorItem[] {
  const errors: SubmitErrorItem[] = []

  if (listing.categoryMainId === CATEGORY_BYTY_ID && !listing.disposition) {
    errors.push({ step: 1, message: 'Vyberte dispozici bytu' })
  }

  if (listing.categoryMainId === CATEGORY_POZEMKY_ID) {
    if (!listing.areaLand || listing.areaLand <= 0) {
      errors.push({ step: 3, message: 'Vyplňte plochu pozemku' })
    }
  } else if (!listing.areaUsable || listing.areaUsable <= 0) {
    errors.push({ step: 3, message: 'Vyplňte užitnou plochu' })
  }

  if (!listing.title.trim()) {
    errors.push({ step: 4, message: 'Vyplňte titulek inzerátu' })
  } else if (listing.title.length > MAX_TITLE_LENGTH) {
    errors.push({ step: 4, message: `Titulek smí mít nejvýše ${MAX_TITLE_LENGTH} znaků` })
  }

  if (listing.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    errors.push({
      step: 4,
      message: `Popis musí mít alespoň ${MIN_DESCRIPTION_LENGTH} znaků`,
    })
  }

  if (!listing.priceHidden && (listing.priceAmount === null || listing.priceAmount <= 0)) {
    errors.push({
      step: 6,
      message: 'Vyplňte cenu, nebo zaškrtněte „Nezveřejňovat cenu"',
    })
  }

  return errors
}
