import type { Disposition, TransactionType } from '@rocket/shared'
import type { ImportListingInput } from '../service'
import {
  BUILDING_CONDITION_BY_CODE,
  BUILDING_TYPE_BY_CODE,
  CURRENCY_CZK_CODE,
  DISPOSITION_BY_ADVERT_SUBTYPE,
  ENERGY_LABEL_BY_CODE,
  FURNISHING_BY_CODE,
  OWNERSHIP_BY_CODE,
  PRICE_UNIT_BY_CODE,
  PROPERTY_TYPE_BY_ADVERT_TYPE,
  TRANSACTION_BY_ADVERT_FUNCTION,
  YES_CODE,
} from './codebooks'
import type { XmlRpcValue } from './xml-rpc'

export type SrealityAdvert = Record<string, XmlRpcValue>

/** Nekompletní nebo nepřevoditelná data inzerátu — volající je mapuje na status 452. */
export class AdvertMappingError extends Error {}

const CATEGORY_BYTY = 1
const CATEGORY_POZEMKY = 3

/**
 * Cena 0 nebo 1 znamená v importním rozhraní „informace o ceně u RK",
 * ne skutečnou cenu — propíše se jako skrytá cena.
 */
const HIDDEN_PRICE_THRESHOLD = 1

const CATEGORY_TITLE_NOUN: Record<number, string> = {
  1: 'bytu',
  2: 'domu',
  3: 'pozemku',
  4: 'komerčního prostoru',
  5: 'nemovitosti',
}

const TRANSACTION_TITLE: Record<TransactionType, string> = {
  prodej: 'Prodej',
  pronajem: 'Pronájem',
  drazba: 'Dražba',
}

const OFFER_TYPE_BY_TRANSACTION: Record<TransactionType, ImportListingInput['offerType']> = {
  prodej: 'sale',
  pronajem: 'rent',
  drazba: 'auction',
}

function readString(advert: SrealityAdvert, key: string): string | undefined {
  const value = advert[key]
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number') return String(value)
  return undefined
}

/** Čísla přijímáme i jako řetězec — exportní software je posílá oběma způsoby. */
function readNumber(advert: SrealityAdvert, key: string): number | undefined {
  const value = advert[key]
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function readInteger(advert: SrealityAdvert, key: string): number | undefined {
  const value = readNumber(advert, key)
  return value === undefined ? undefined : Math.round(value)
}

function readBoolean(advert: SrealityAdvert, key: string): boolean | undefined {
  const value = advert[key]
  if (typeof value === 'boolean') return value
  const numeric = readNumber(advert, key)
  return numeric === undefined ? undefined : numeric !== 0
}

/** Číselník s významem ano/ne (výtah, bezbariérovost): 1 = ano, 2 = ne. */
function readYesNo(advert: SrealityAdvert, key: string): boolean | undefined {
  const value = advert[key]
  if (typeof value === 'boolean') return value
  const code = readNumber(advert, key)
  return code === undefined ? undefined : code === YES_CODE
}

/** Nevalidní odkaz raději zahodíme, než aby kvůli němu neprošel celý inzerát. */
function readUrl(advert: SrealityAdvert, key: string): string | undefined {
  const value = readString(advert, key)
  if (!value) return undefined
  return URL.canParse(value) ? value : undefined
}

function lookup<T>(table: Record<number, T>, code: number | undefined): T | undefined {
  return code === undefined ? undefined : table[code]
}

function resolveTransaction(advert: SrealityAdvert): TransactionType {
  const transaction = lookup(TRANSACTION_BY_ADVERT_FUNCTION, readInteger(advert, 'advert_function'))
  if (!transaction) {
    throw new AdvertMappingError('Chybí nebo je neznámý typ inzerátu (advert_function)')
  }
  return transaction
}

function resolveCategory(advert: SrealityAdvert): { categoryCode: number; propertyType: string } {
  const categoryCode = readInteger(advert, 'advert_type')
  const propertyType = lookup(PROPERTY_TYPE_BY_ADVERT_TYPE, categoryCode)
  if (categoryCode === undefined || !propertyType) {
    throw new AdvertMappingError('Chybí nebo je neznámá kategorie inzerátu (advert_type)')
  }
  return { categoryCode, propertyType }
}

function resolveDisposition(advert: SrealityAdvert, categoryCode: number): Disposition | undefined {
  const disposition = lookup(DISPOSITION_BY_ADVERT_SUBTYPE, readInteger(advert, 'advert_subtype'))
  if (categoryCode === CATEGORY_BYTY && !disposition) {
    throw new AdvertMappingError('U bytu chybí podkategorie s dispozicí (advert_subtype)')
  }
  return disposition
}

/**
 * Užitná plocha; u pozemků, kde se neuvádí, zastoupí plocha pozemku —
 * jinak by výpis i filtr plochy zůstaly u pozemků prázdné.
 */
function resolveArea(advert: SrealityAdvert, categoryCode: number): number | undefined {
  const usableArea = readInteger(advert, 'usable_area')
  if (usableArea) return usableArea
  if (categoryCode === CATEGORY_POZEMKY) return readInteger(advert, 'estate_area') || undefined
  return undefined
}

function resolvePrice(advert: SrealityAdvert): number | null {
  const currency = readInteger(advert, 'advert_price_currency')
  if (currency !== undefined && currency !== CURRENCY_CZK_CODE) {
    throw new AdvertMappingError('Podporovaná je jen cena v Kč (advert_price_currency = 1)')
  }
  const price = readNumber(advert, 'advert_price')
  if (price === undefined || price <= HIDDEN_PRICE_THRESHOLD) return null
  return Math.round(price)
}

/** Ulice s číslem popisným/orientačním tak, jak se v adrese píše: „Botanická 68a/12". */
function resolveStreet(advert: SrealityAdvert): string | undefined {
  const street = readString(advert, 'locality_street')
  const houseNumber = [readString(advert, 'locality_cp'), readString(advert, 'locality_co')]
    .filter(Boolean)
    .join('/')
  if (!street) return houseNumber || undefined
  return houseNumber ? `${street} ${houseNumber}` : street
}

/**
 * Importní rozhraní název inzerátu nepřenáší — portály si ho skládají z parametrů.
 * Držíme se tvaru, jaký používá výpis: „Prodej bytu 2+kk, 55 m², Brno".
 */
function buildTitle(params: {
  transaction: TransactionType
  categoryCode: number
  disposition: Disposition | undefined
  area: number | undefined
  city: string
}): string {
  const noun = CATEGORY_TITLE_NOUN[params.categoryCode] ?? CATEGORY_TITLE_NOUN[5]!
  const parts = [`${TRANSACTION_TITLE[params.transaction]} ${noun}`]
  if (params.disposition && params.disposition !== 'atypicky') parts[0] += ` ${params.disposition}`
  if (params.area) parts.push(`${params.area} m²`)
  parts.push(params.city)
  return parts.join(', ').slice(0, 200)
}

function mapAttributes(advert: SrealityAdvert): ImportListingInput['attributes'] {
  const priceUnit = lookup(PRICE_UNIT_BY_CODE, readInteger(advert, 'advert_price_unit'))
  return {
    ownership: lookup(OWNERSHIP_BY_CODE, readInteger(advert, 'ownership')),
    buildingType: lookup(BUILDING_TYPE_BY_CODE, readInteger(advert, 'building_type')),
    buildingCondition: lookup(
      BUILDING_CONDITION_BY_CODE,
      readInteger(advert, 'building_condition'),
    ),
    furnishing: lookup(FURNISHING_BY_CODE, readInteger(advert, 'furnished')),
    energyLabel: lookup(ENERGY_LABEL_BY_CODE, readInteger(advert, 'energy_efficiency_rating')),
    priceUnit,
    floorNumber: readInteger(advert, 'floor_number'),
    floorsTotal: readInteger(advert, 'floors'),
    builtUpArea: readInteger(advert, 'building_area'),
    gardenArea: readInteger(advert, 'garden_area'),
    hasBalcony: readBoolean(advert, 'balcony'),
    balconyArea: readInteger(advert, 'balcony_area'),
    hasTerrace: readBoolean(advert, 'terrace'),
    hasLoggia: readBoolean(advert, 'loggia'),
    loggiaArea: readInteger(advert, 'loggia_area'),
    hasCellar: readBoolean(advert, 'cellar'),
    cellarArea: readInteger(advert, 'cellar_area'),
    hasElevator: readYesNo(advert, 'elevator'),
    hasGarage: readBoolean(advert, 'garage'),
    garageCount: readInteger(advert, 'garage_count'),
    hasParking: readBoolean(advert, 'parking_lots'),
    parkingCount: readInteger(advert, 'parking'),
    barrierFree: readYesNo(advert, 'easy_access'),
    virtualTourUrl: readUrl(advert, 'matterport_url'),
  }
}

/**
 * Převede strukturu advert_data z importního rozhraní na vstup veřejného
 * importního kontraktu. Fotky se přenášejí samostatnou metodou addPhoto,
 * proto sem nepatří. Přesná poloha z locality_latitude/longitude se zatím
 * nevyužívá — souřadnice se odvozují z obce stejně jako u JSON importu.
 */
export function mapAdvertToImportInput(
  advert: SrealityAdvert,
  externalId: string,
): ImportListingInput {
  const city = readString(advert, 'locality_city')
  if (!city) throw new AdvertMappingError('Chybí město (locality_city)')

  const transaction = resolveTransaction(advert)
  const { categoryCode, propertyType } = resolveCategory(advert)
  const disposition = resolveDisposition(advert, categoryCode)
  const area = resolveArea(advert, categoryCode)

  return {
    externalId,
    title: buildTitle({ transaction, categoryCode, disposition, area, city }),
    description: readString(advert, 'description') ?? '',
    offerType: OFFER_TYPE_BY_TRANSACTION[transaction],
    propertyType,
    disposition: disposition ?? null,
    price: resolvePrice(advert),
    priceNote: readString(advert, 'advert_price_text_note'),
    currency: 'CZK',
    size: area,
    location: { city, street: resolveStreet(advert) },
    attributes: mapAttributes(advert),
    photos: [],
  }
}
