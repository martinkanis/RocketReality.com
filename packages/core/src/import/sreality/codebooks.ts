import type {
  BuildingCondition,
  BuildingType,
  Disposition,
  EnergyLabel,
  FurnishingType,
  OwnershipType,
  PriceUnit,
  TransactionType,
} from '@rocket/shared'

/**
 * Převodní tabulky číselníků importního rozhraní na doménové hodnoty portálu.
 * Čísla vlevo jsou hodnoty číselníků tak, jak je posílá exportní software
 * realitní kanceláře — nikdy je neměnit, jen doplňovat.
 */

/** advert_function — typ inzerátu. Podíly (4) jsou z pohledu portálu prodej. */
export const TRANSACTION_BY_ADVERT_FUNCTION: Record<number, TransactionType> = {
  1: 'prodej',
  2: 'pronajem',
  3: 'drazba',
  4: 'prodej',
}

/**
 * advert_type — kategorie. Hodnoty odpovídají našim categoryMainId, mapujeme
 * je ale na klíče veřejného importního kontraktu (propertyType), aby zůstal
 * jediný vstupní bod pro všechny importy.
 */
export const PROPERTY_TYPE_BY_ADVERT_TYPE: Record<number, string> = {
  1: 'byt',
  2: 'dum',
  3: 'pozemek',
  4: 'komercni',
  5: 'ostatni',
}

/** advert_subtype — podkategorie; dispozici nesou jen podkategorie bytů. */
export const DISPOSITION_BY_ADVERT_SUBTYPE: Record<number, Disposition> = {
  2: '1+kk',
  3: '1+1',
  4: '2+kk',
  5: '2+1',
  6: '3+kk',
  7: '3+1',
  8: '4+kk',
  9: '4+1',
  10: '5+kk',
  11: '5+1',
  12: '6+',
  16: 'atypicky',
  47: 'pokoj',
}

/** advert_price_unit — jednotky bez protějšku (za rok, za den, za hodinu) nemapujeme. */
export const PRICE_UNIT_BY_CODE: Record<number, PriceUnit> = {
  1: 'celkem',
  2: 'za_mesic',
  3: 'za_m2',
  4: 'za_m2_mesic',
  5: 'za_m2_rok',
}

export const CURRENCY_CZK_CODE = 1

export const OWNERSHIP_BY_CODE: Record<number, OwnershipType> = {
  1: 'osobni',
  2: 'druzstevni',
  3: 'statni_obecni',
}

/** building_type — Modulární (8) nemá vlastní hodnotu, spadá pod „jiná". */
export const BUILDING_TYPE_BY_CODE: Record<number, BuildingType> = {
  1: 'drevostavba',
  2: 'cihlova',
  3: 'kamenna',
  4: 'montovana',
  5: 'panelova',
  6: 'skeletova',
  7: 'smisena',
  8: 'jina',
}

export const BUILDING_CONDITION_BY_CODE: Record<number, BuildingCondition> = {
  1: 'velmi_dobry',
  2: 'dobry',
  3: 'spatny',
  4: 've_vystavbe',
  5: 'projekt',
  6: 'novostavba',
  7: 'k_demolici',
  8: 'pred_rekonstrukci',
  9: 'po_rekonstrukci',
  10: 'v_rekonstrukci',
}

export const FURNISHING_BY_CODE: Record<number, FurnishingType> = {
  1: 'zarizeno',
  2: 'nezarizeno',
  3: 'castecne_zarizeno',
}

export const ENERGY_LABEL_BY_CODE: Record<number, EnergyLabel> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
  5: 'E',
  6: 'F',
  7: 'G',
}

/** Číselníky s významem ano/ne (elevator, easy_access) — 1 = ano, 2 = ne. */
export const YES_CODE = 1
export const NO_CODE = 2
