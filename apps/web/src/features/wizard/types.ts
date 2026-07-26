import {
  CATEGORY_BYTY_ID,
  TRANSACTION_LABELS,
  type AddressVisibility,
  type BuildingCondition,
  type BuildingType,
  type Disposition,
  type EnergyLabel,
  type FurnishingType,
  type OwnershipType,
  type TransactionType,
} from '@rocket/shared'

export const CATEGORY_DOMY_ID = 2
export const CATEGORY_POZEMKY_ID = 3
export const CATEGORY_KOMERCNI_ID = 4
export const CATEGORY_OSTATNI_ID = 5

export const MAX_TITLE_LENGTH = 120
export const MIN_DESCRIPTION_LENGTH = 50

export const MAX_PHOTOS = 20
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024
export const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const WIZARD_STEPS = [
  { id: 1, title: 'Co nabízíte' },
  { id: 2, title: 'Kde' },
  { id: 3, title: 'Parametry' },
  { id: 4, title: 'Popis' },
  { id: 5, title: 'Fotografie' },
  { id: 6, title: 'Cena a odeslání' },
] as const

/** Obec pro výběr v kroku „Kde" — okres pomáhá rozlišit stejnojmenné obce. */
export interface MunicipalityOption {
  id: number
  name: string
  slug: string
  districtId: number
  districtName: string
}

export interface PhotoItem {
  id: string
  storageKey: string
  position: number
}

/** Sítě na pozemku — ukládají se do listings.attributes (jsonb). */
export interface UtilityFlags {
  elektrina: boolean
  voda: boolean
  plyn: boolean
  kanalizace: boolean
}

/** Stav formuláře průvodce — číselné hodnoty drží jako string kvůli inputům. */
export interface WizardData {
  transaction: TransactionType | null
  categoryMainId: number | null
  categorySubId: number | null
  disposition: Disposition | null
  municipalityId: number | null
  street: string
  streetNumber: string
  addressVisibility: AddressVisibility
  areaUsable: string
  areaBuiltUp: string
  areaLand: string
  areaGarden: string
  floorNumber: string
  floorsTotal: string
  ownership: OwnershipType | ''
  buildingType: BuildingType | ''
  buildingCondition: BuildingCondition | ''
  energyLabel: EnergyLabel
  hasBalcony: boolean
  balconyArea: string
  hasTerrace: boolean
  terraceArea: string
  hasLoggia: boolean
  loggiaArea: string
  hasCellar: boolean
  cellarArea: string
  hasElevator: boolean
  hasGarage: boolean
  hasParking: boolean
  barrierFree: boolean
  utilities: UtilityFlags
  furnishing: FurnishingType | ''
  monthlyFees: string
  deposit: string
  availableFrom: string
  title: string
  titleEdited: boolean
  description: string
  priceAmount: string
  priceNote: string
  priceHidden: boolean
}

/** Data konceptu posílaná do server action `saveDraft` — už zparsovaná do cílových typů. */
export interface DraftPayload {
  transaction: TransactionType
  categoryMainId: number
  categorySubId: number | null
  disposition: Disposition | null
  municipalityId: number | null
  street: string | null
  streetNumber: string | null
  addressVisibility: AddressVisibility
  areaUsable: number | null
  areaBuiltUp: number | null
  areaLand: number | null
  areaGarden: number | null
  floorNumber: number | null
  floorsTotal: number | null
  ownership: OwnershipType | null
  buildingType: BuildingType | null
  buildingCondition: BuildingCondition | null
  energyLabel: EnergyLabel
  hasBalcony: boolean
  balconyArea: number | null
  hasTerrace: boolean
  terraceArea: number | null
  hasLoggia: boolean
  loggiaArea: number | null
  hasCellar: boolean
  cellarArea: number | null
  hasElevator: boolean
  hasGarage: boolean
  hasParking: boolean
  barrierFree: boolean
  utilities: UtilityFlags | null
  furnishing: FurnishingType | null
  monthlyFees: number | null
  deposit: number | null
  availableFrom: string | null
  title: string
  description: string
  priceAmount: number | null
  priceNote: string | null
  priceHidden: boolean
}

export interface StepProps {
  data: WizardData
  onChange: (patch: Partial<WizardData>) => void
}

export type SaveDraftResult = { ok: true; listingId: string | null } | { ok: false; error: string }

export type CreateUploadUrlResult =
  { ok: true; uploadUrl: string; storageKey: string } | { ok: false; error: string }

export type RegisterPhotoResult = { ok: true; photo: PhotoItem } | { ok: false; error: string }

export type PhotoActionResult = { ok: true } | { ok: false; error: string }

export interface SubmitErrorItem {
  step: number
  message: string
}

export type SubmitListingResult = { ok: true } | { ok: false; errors: SubmitErrorItem[] }

export function createEmptyWizardData(): WizardData {
  return {
    transaction: null,
    categoryMainId: null,
    categorySubId: null,
    disposition: null,
    municipalityId: null,
    street: '',
    streetNumber: '',
    addressVisibility: 'presna',
    areaUsable: '',
    areaBuiltUp: '',
    areaLand: '',
    areaGarden: '',
    floorNumber: '',
    floorsTotal: '',
    ownership: '',
    buildingType: '',
    buildingCondition: '',
    energyLabel: 'G',
    hasBalcony: false,
    balconyArea: '',
    hasTerrace: false,
    terraceArea: '',
    hasLoggia: false,
    loggiaArea: '',
    hasCellar: false,
    cellarArea: '',
    hasElevator: false,
    hasGarage: false,
    hasParking: false,
    barrierFree: false,
    utilities: { elektrina: false, voda: false, plyn: false, kanalizace: false },
    furnishing: '',
    monthlyFees: '',
    deposit: '',
    availableFrom: '',
    title: '',
    titleEdited: false,
    description: '',
    priceAmount: '',
    priceNote: '',
    priceHidden: false,
  }
}

/** Zparsuje číslo z inputu (podporuje čárku jako desetinný oddělovač). */
export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseOptionalInt(value: string): number | null {
  const parsed = parseOptionalNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** Převede stav formuláře na payload pro uložení — pole mimo zvolenou kategorii vynuluje. */
export function toDraftPayload(data: WizardData): DraftPayload {
  if (!data.transaction || !data.categoryMainId) {
    throw new Error('Payload konceptu vyžaduje typ nabídky a kategorii')
  }
  const isByty = data.categoryMainId === CATEGORY_BYTY_ID
  const isDomy = data.categoryMainId === CATEGORY_DOMY_ID
  const isPozemky = data.categoryMainId === CATEGORY_POZEMKY_ID
  const hasBuilding = isByty || isDomy
  const isRent = data.transaction === 'pronajem'

  return {
    transaction: data.transaction,
    categoryMainId: data.categoryMainId,
    categorySubId: isByty ? null : data.categorySubId,
    disposition: isByty ? data.disposition : null,
    municipalityId: data.municipalityId,
    street: emptyToNull(data.street),
    streetNumber: emptyToNull(data.streetNumber),
    addressVisibility: data.addressVisibility,
    areaUsable: isPozemky ? null : parseOptionalNumber(data.areaUsable),
    areaBuiltUp: isDomy ? parseOptionalNumber(data.areaBuiltUp) : null,
    areaLand: isDomy || isPozemky ? parseOptionalNumber(data.areaLand) : null,
    areaGarden: isDomy ? parseOptionalNumber(data.areaGarden) : null,
    floorNumber: isByty ? parseOptionalInt(data.floorNumber) : null,
    floorsTotal: hasBuilding ? parseOptionalInt(data.floorsTotal) : null,
    ownership: hasBuilding && data.ownership ? data.ownership : null,
    buildingType: hasBuilding && data.buildingType ? data.buildingType : null,
    buildingCondition: hasBuilding && data.buildingCondition ? data.buildingCondition : null,
    energyLabel: data.energyLabel,
    hasBalcony: hasBuilding && data.hasBalcony,
    balconyArea: hasBuilding && data.hasBalcony ? parseOptionalNumber(data.balconyArea) : null,
    hasTerrace: hasBuilding && data.hasTerrace,
    terraceArea: hasBuilding && data.hasTerrace ? parseOptionalNumber(data.terraceArea) : null,
    hasLoggia: isByty && data.hasLoggia,
    loggiaArea: isByty && data.hasLoggia ? parseOptionalNumber(data.loggiaArea) : null,
    hasCellar: hasBuilding && data.hasCellar,
    cellarArea: hasBuilding && data.hasCellar ? parseOptionalNumber(data.cellarArea) : null,
    hasElevator: isByty && data.hasElevator,
    hasGarage: hasBuilding && data.hasGarage,
    hasParking: hasBuilding && data.hasParking,
    barrierFree: hasBuilding && data.barrierFree,
    utilities: isPozemky ? data.utilities : null,
    furnishing: isRent && data.furnishing ? data.furnishing : null,
    monthlyFees: isRent ? parseOptionalNumber(data.monthlyFees) : null,
    deposit: isRent ? parseOptionalNumber(data.deposit) : null,
    availableFrom: isRent ? emptyToNull(data.availableFrom) : null,
    title: data.title.trim(),
    description: data.description,
    priceAmount: parseOptionalNumber(data.priceAmount),
    priceNote: emptyToNull(data.priceNote),
    priceHidden: data.priceHidden,
  }
}

const TITLE_SUBJECTS: Record<number, string> = {
  [CATEGORY_DOMY_ID]: 'domu',
  [CATEGORY_POZEMKY_ID]: 'pozemku',
  [CATEGORY_KOMERCNI_ID]: 'komerčního prostoru',
  [CATEGORY_OSTATNI_ID]: 'nemovitosti',
}

/** Návrh titulku: „Prodej bytu 2+kk 65 m², Brno" — uživatel ho může libovolně upravit. */
export function buildTitleSuggestion(data: WizardData, municipalityName: string): string {
  if (!data.transaction || !data.categoryMainId) return ''
  const subject =
    data.categoryMainId === CATEGORY_BYTY_ID
      ? data.disposition
        ? `bytu ${data.disposition}`
        : 'bytu'
      : (TITLE_SUBJECTS[data.categoryMainId] ?? 'nemovitosti')
  const area = parseOptionalNumber(
    data.categoryMainId === CATEGORY_POZEMKY_ID ? data.areaLand : data.areaUsable,
  )
  const areaPart = area ? ` ${area} m²` : ''
  const locationPart = municipalityName ? `, ${municipalityName}` : ''
  return `${TRANSACTION_LABELS[data.transaction]} ${subject}${areaPart}${locationPart}`
}
