import type { listings } from '@rocket/db'
import { createEmptyWizardData, type WizardData } from './types'

type ListingRow = typeof listings.$inferSelect

function numberToInput(value: number | null): string {
  return value === null ? '' : String(value)
}

/** Obnoví stav průvodce z uloženého konceptu (nebo zamítnutého inzerátu). */
export function listingRowToWizardData(row: ListingRow): WizardData {
  const attributes = (row.attributes ?? {}) as Record<string, unknown>
  return {
    ...createEmptyWizardData(),
    transaction: row.transaction,
    categoryMainId: row.categoryMainId,
    categorySubId: row.categorySubId,
    disposition: row.disposition,
    municipalityId: row.municipalityId,
    street: row.street ?? '',
    streetNumber: row.streetNumber ?? '',
    // Uloženou polohu držíme, aby ji uložení konceptu nepřepsalo středem obce.
    addressLat: row.locationPoint?.y ?? null,
    addressLng: row.locationPoint?.x ?? null,
    addressVisibility: row.addressVisibility,
    areaUsable: numberToInput(row.areaUsable),
    areaBuiltUp: numberToInput(row.areaBuiltUp),
    areaLand: numberToInput(row.areaLand),
    areaGarden: numberToInput(row.areaGarden),
    floorNumber: numberToInput(row.floorNumber),
    floorsTotal: numberToInput(row.floorsTotal),
    ownership: row.ownership ?? '',
    buildingType: row.buildingType ?? '',
    buildingCondition: row.buildingCondition ?? '',
    energyLabel: row.energyLabel,
    hasBalcony: row.hasBalcony,
    balconyArea: numberToInput(row.balconyArea),
    hasTerrace: row.hasTerrace,
    terraceArea: numberToInput(row.terraceArea),
    hasLoggia: row.hasLoggia,
    loggiaArea: numberToInput(row.loggiaArea),
    hasCellar: row.hasCellar,
    cellarArea: numberToInput(row.cellarArea),
    hasElevator: row.hasElevator,
    hasGarage: row.hasGarage,
    hasParking: row.hasParking,
    barrierFree: row.barrierFree,
    utilities: {
      elektrina: attributes.elektrina === true,
      voda: attributes.voda === true,
      plyn: attributes.plyn === true,
      kanalizace: attributes.kanalizace === true,
    },
    furnishing: row.furnishing ?? '',
    monthlyFees: numberToInput(row.monthlyFees),
    deposit: numberToInput(row.deposit),
    availableFrom: row.availableFrom ?? '',
    title: row.title,
    titleEdited: row.title.trim().length > 0,
    description: row.description,
    priceAmount: numberToInput(row.priceAmount),
    priceNote: row.priceNote ?? '',
    priceHidden: row.priceHidden,
  }
}
