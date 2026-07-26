'use client'

import {
  BUILDING_CONDITIONS,
  BUILDING_CONDITION_LABELS,
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
  CATEGORY_BYTY_ID,
  ENERGY_LABELS,
  FURNISHING_LABELS,
  FURNISHING_TYPES,
  OWNERSHIP_LABELS,
  OWNERSHIP_TYPES,
} from '@rocket/shared'
import type { EnergyLabel } from '@rocket/shared'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, NumberField, SelectField } from '../fields'
import { CATEGORY_DOMY_ID, CATEGORY_POZEMKY_ID } from '../types'
import type { StepProps, UtilityFlags, WizardData } from '../types'

interface AmenityCheckboxProps {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  areaValue?: string
  onAreaChange?: (value: string) => void
}

/** Checkbox vybavení — po zaškrtnutí volitelně nabídne pole pro plochu v m². */
function AmenityCheckbox({
  id,
  label,
  checked,
  onCheckedChange,
  areaValue,
  onAreaChange,
}: AmenityCheckboxProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(state) => onCheckedChange(state === true)}
        />
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
      </div>
      {checked && onAreaChange && (
        <Input
          type="number"
          min={0}
          step="any"
          placeholder="Plocha v m²"
          aria-label={`${label} — plocha v m²`}
          value={areaValue ?? ''}
          onChange={(event) => onAreaChange(event.target.value)}
        />
      )}
    </div>
  )
}

const UTILITY_LABELS: Record<keyof UtilityFlags, string> = {
  elektrina: 'Elektřina',
  voda: 'Voda',
  plyn: 'Plyn',
  kanalizace: 'Kanalizace',
}

interface AmenityDefinition {
  key: string
  label: string
  isChecked: (data: WizardData) => boolean
  setChecked: (checked: boolean) => Partial<WizardData>
  getArea?: (data: WizardData) => string
  setArea?: (value: string) => Partial<WizardData>
}

const BYTY_AMENITIES: AmenityDefinition[] = [
  {
    key: 'balcony',
    label: 'Balkon',
    isChecked: (data) => data.hasBalcony,
    setChecked: (hasBalcony) => ({ hasBalcony }),
    getArea: (data) => data.balconyArea,
    setArea: (balconyArea) => ({ balconyArea }),
  },
  {
    key: 'terrace',
    label: 'Terasa',
    isChecked: (data) => data.hasTerrace,
    setChecked: (hasTerrace) => ({ hasTerrace }),
    getArea: (data) => data.terraceArea,
    setArea: (terraceArea) => ({ terraceArea }),
  },
  {
    key: 'loggia',
    label: 'Lodžie',
    isChecked: (data) => data.hasLoggia,
    setChecked: (hasLoggia) => ({ hasLoggia }),
    getArea: (data) => data.loggiaArea,
    setArea: (loggiaArea) => ({ loggiaArea }),
  },
  {
    key: 'cellar',
    label: 'Sklep',
    isChecked: (data) => data.hasCellar,
    setChecked: (hasCellar) => ({ hasCellar }),
    getArea: (data) => data.cellarArea,
    setArea: (cellarArea) => ({ cellarArea }),
  },
  {
    key: 'elevator',
    label: 'Výtah',
    isChecked: (data) => data.hasElevator,
    setChecked: (hasElevator) => ({ hasElevator }),
  },
  {
    key: 'garage',
    label: 'Garáž',
    isChecked: (data) => data.hasGarage,
    setChecked: (hasGarage) => ({ hasGarage }),
  },
  {
    key: 'parking',
    label: 'Parkování',
    isChecked: (data) => data.hasParking,
    setChecked: (hasParking) => ({ hasParking }),
  },
  {
    key: 'barrierFree',
    label: 'Bezbariérový',
    isChecked: (data) => data.barrierFree,
    setChecked: (barrierFree) => ({ barrierFree }),
  },
]

const DOMY_AMENITIES: AmenityDefinition[] = BYTY_AMENITIES.filter(
  (amenity) => amenity.key !== 'loggia' && amenity.key !== 'elevator',
)

export function StepParameters({ data, onChange }: StepProps) {
  const isByty = data.categoryMainId === CATEGORY_BYTY_ID
  const isDomy = data.categoryMainId === CATEGORY_DOMY_ID
  const isPozemky = data.categoryMainId === CATEGORY_POZEMKY_ID
  const hasBuilding = isByty || isDomy
  const isRent = data.transaction === 'pronajem'
  const amenities = isByty ? BYTY_AMENITIES : DOMY_AMENITIES

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-heading">Plochy a podlaží</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!isPozemky && (
            <NumberField
              id="areaUsable"
              label="Užitná plocha"
              unit="m²"
              required
              value={data.areaUsable}
              onChange={(areaUsable) => onChange({ areaUsable })}
            />
          )}
          {(isDomy || isPozemky) && (
            <NumberField
              id="areaLand"
              label="Plocha pozemku"
              unit="m²"
              required={isPozemky}
              value={data.areaLand}
              onChange={(areaLand) => onChange({ areaLand })}
            />
          )}
          {isDomy && (
            <>
              <NumberField
                id="areaBuiltUp"
                label="Zastavěná plocha"
                unit="m²"
                value={data.areaBuiltUp}
                onChange={(areaBuiltUp) => onChange({ areaBuiltUp })}
              />
              <NumberField
                id="areaGarden"
                label="Plocha zahrady"
                unit="m²"
                value={data.areaGarden}
                onChange={(areaGarden) => onChange({ areaGarden })}
              />
              <NumberField
                id="floorsTotal"
                label="Počet podlaží"
                min={1}
                step="1"
                value={data.floorsTotal}
                onChange={(floorsTotal) => onChange({ floorsTotal })}
              />
            </>
          )}
          {isByty && (
            <>
              <NumberField
                id="floorNumber"
                label="Podlaží"
                min={-5}
                step="1"
                value={data.floorNumber}
                onChange={(floorNumber) => onChange({ floorNumber })}
              />
              <NumberField
                id="floorsTotal"
                label="Celkem podlaží v domě"
                min={1}
                step="1"
                value={data.floorsTotal}
                onChange={(floorsTotal) => onChange({ floorsTotal })}
              />
            </>
          )}
        </div>
      </section>

      {hasBuilding && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">Budova</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="ownership"
              label="Vlastnictví"
              value={data.ownership}
              onChange={(value) => onChange({ ownership: value as WizardData['ownership'] })}
              options={OWNERSHIP_TYPES.map((type) => ({
                value: type,
                label: OWNERSHIP_LABELS[type],
              }))}
            />
            <SelectField
              id="buildingType"
              label="Typ stavby"
              value={data.buildingType}
              onChange={(value) => onChange({ buildingType: value as WizardData['buildingType'] })}
              options={BUILDING_TYPES.map((type) => ({
                value: type,
                label: BUILDING_TYPE_LABELS[type],
              }))}
            />
            <SelectField
              id="buildingCondition"
              label="Stav budovy"
              value={data.buildingCondition}
              onChange={(value) =>
                onChange({ buildingCondition: value as WizardData['buildingCondition'] })
              }
              options={BUILDING_CONDITIONS.map((condition) => ({
                value: condition,
                label: BUILDING_CONDITION_LABELS[condition],
              }))}
            />
            <SelectField
              id="energyLabel"
              label="Energetická třída"
              value={data.energyLabel}
              onChange={(value) => onChange({ energyLabel: value as EnergyLabel })}
              options={ENERGY_LABELS.map((label) => ({ value: label, label }))}
            />
          </div>
        </section>
      )}

      {hasBuilding && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">Vybavení a příslušenství</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {amenities.map((amenity) => {
              const setArea = amenity.setArea
              return (
                <AmenityCheckbox
                  key={amenity.key}
                  id={`amenity-${amenity.key}`}
                  label={amenity.label}
                  checked={amenity.isChecked(data)}
                  onCheckedChange={(checked) => onChange(amenity.setChecked(checked))}
                  areaValue={amenity.getArea?.(data)}
                  onAreaChange={setArea ? (value) => onChange(setArea(value)) : undefined}
                />
              )
            })}
          </div>
        </section>
      )}

      {isPozemky && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">Inženýrské sítě na pozemku</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(UTILITY_LABELS) as (keyof UtilityFlags)[]).map((utility) => (
              <div
                key={utility}
                className="flex items-center gap-2 rounded-md border border-border p-3"
              >
                <Checkbox
                  id={`utility-${utility}`}
                  checked={data.utilities[utility]}
                  onCheckedChange={(state) =>
                    onChange({ utilities: { ...data.utilities, [utility]: state === true } })
                  }
                />
                <Label htmlFor={`utility-${utility}`} className="cursor-pointer">
                  {UTILITY_LABELS[utility]}
                </Label>
              </div>
            ))}
          </div>
        </section>
      )}

      {isRent && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-heading">Podmínky pronájmu</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="furnishing"
              label="Zařízenost"
              value={data.furnishing}
              onChange={(value) => onChange({ furnishing: value as WizardData['furnishing'] })}
              options={FURNISHING_TYPES.map((type) => ({
                value: type,
                label: FURNISHING_LABELS[type],
              }))}
            />
            <NumberField
              id="monthlyFees"
              label="Měsíční poplatky"
              unit="Kč"
              value={data.monthlyFees}
              onChange={(monthlyFees) => onChange({ monthlyFees })}
            />
            <NumberField
              id="deposit"
              label="Vratná kauce"
              unit="Kč"
              value={data.deposit}
              onChange={(deposit) => onChange({ deposit })}
            />
            <Field id="availableFrom" label="K dispozici od">
              <Input
                id="availableFrom"
                type="date"
                value={data.availableFrom}
                onChange={(event) => onChange({ availableFrom: event.target.value })}
              />
            </Field>
          </div>
        </section>
      )}
    </div>
  )
}
