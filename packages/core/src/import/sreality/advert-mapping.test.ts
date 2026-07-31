import { describe, expect, it } from 'vitest'
import { importListingSchema } from '../service'
import { AdvertMappingError, mapAdvertToImportInput, type SrealityAdvert } from './advert-mapping'
import type { XmlRpcValue } from './xml-rpc'

/** Byt 2+kk na prodej — nejběžnější tvar dat z exportního softwaru. */
const apartmentForSale: SrealityAdvert = {
  advert_function: 1,
  advert_type: 1,
  advert_subtype: 4,
  advert_price: 5_500_000,
  advert_price_currency: 1,
  advert_price_unit: 1,
  description: 'Světlý byt po rekonstrukci.',
  locality_city: 'Brno',
  usable_area: 55,
  ownership: 1,
  building_type: 2,
  building_condition: 9,
  energy_efficiency_rating: 3,
  elevator: 1,
  balcony: true,
  cellar: false,
}

/** Hodnota undefined v overrides znamená „exportní software pole neposlal". */
function map(overrides: Record<string, XmlRpcValue | undefined> = {}, externalId = 'RK-001') {
  const advert: SrealityAdvert = { ...apartmentForSale }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete advert[key]
    else advert[key] = value
  }
  return mapAdvertToImportInput(advert, externalId)
}

describe('mapAdvertToImportInput', () => {
  it('převede byt na prodej včetně parametrů', () => {
    const input = map()

    expect(input).toMatchObject({
      externalId: 'RK-001',
      offerType: 'sale',
      propertyType: 'byt',
      disposition: '2+kk',
      price: 5_500_000,
      currency: 'CZK',
      size: 55,
      location: { city: 'Brno' },
      description: 'Světlý byt po rekonstrukci.',
    })
    expect(input.attributes).toMatchObject({
      ownership: 'osobni',
      buildingType: 'cihlova',
      buildingCondition: 'po_rekonstrukci',
      energyLabel: 'C',
      priceUnit: 'celkem',
      hasElevator: true,
      hasBalcony: true,
      hasCellar: false,
    })
  })

  it('složí název inzerátu z parametrů, protože ho rozhraní nepřenáší', () => {
    expect(map().title).toBe('Prodej bytu 2+kk, 55 m², Brno')
  })

  it('pronájem mapuje na rent a jednotku za měsíc', () => {
    const input = map({ advert_function: 2, advert_price: 18_000, advert_price_unit: 2 })

    expect(input.offerType).toBe('rent')
    expect(input.attributes?.priceUnit).toBe('za_mesic')
    expect(input.title).toBe('Pronájem bytu 2+kk, 55 m², Brno')
  })

  it('dražbu mapuje na auction, ne na běžný prodej', () => {
    expect(map({ advert_function: 3 }).offerType).toBe('auction')
  })

  it('podíly jsou z pohledu portálu prodej', () => {
    expect(map({ advert_function: 4 }).offerType).toBe('sale')
  })

  it('cena 0 nebo 1 znamená cenu na dotaz', () => {
    expect(map({ advert_price: 0 }).price).toBeNull()
    expect(map({ advert_price: 1 }).price).toBeNull()
  })

  it('u pozemku zastoupí užitnou plochu plocha pozemku', () => {
    const input = map({
      advert_type: 3,
      advert_subtype: 19,
      usable_area: undefined,
      estate_area: 800,
    })

    expect(input.size).toBe(800)
    expect(input.propertyType).toBe('pozemek')
    expect(input.title).toBe('Prodej pozemku, 800 m², Brno')
  })

  it('složí ulici z názvu a čísel popisného i orientačního', () => {
    const input = map({ locality_street: 'Botanická', locality_cp: '68', locality_co: '12' })

    expect(input.location.street).toBe('Botanická 68/12')
  })

  it('přijme čísla poslaná jako řetězec', () => {
    const input = map({ advert_price: '5500000', usable_area: '55' })

    expect(input.price).toBe(5_500_000)
    expect(input.size).toBe(55)
  })

  it('zahodí nevalidní odkaz na virtuální prohlídku', () => {
    expect(map({ matterport_url: 'nejaky-nesmysl' }).attributes?.virtualTourUrl).toBeUndefined()
    expect(
      map({ matterport_url: 'https://my.matterport.com/show/?m=a' }).attributes?.virtualTourUrl,
    ).toBe('https://my.matterport.com/show/?m=a')
  })

  it('přenese přesné souřadnice, aby inzeráty nesplynuly ve středu obce', () => {
    const input = map({ locality_latitude: 49.2018, locality_longitude: 16.5942 })

    expect(input.location.lat).toBe(49.2018)
    expect(input.location.lng).toBe(16.5942)
  })

  it('bez souřadnic je nechá nevyplněné a polohu doplní importní služba', () => {
    expect(map().location.lat).toBeUndefined()
    expect(map().location.lng).toBeUndefined()
  })

  it('převede úroveň znepřesnění adresy na viditelnost adresy', () => {
    expect(map({ locality_inaccuracy_level: 1 }).location.addressVisibility).toBe('presna')
    expect(map({ locality_inaccuracy_level: 2 }).location.addressVisibility).toBe('ulice')
    expect(map({ locality_inaccuracy_level: 3 }).location.addressVisibility).toBe('obec')
    expect(map().location.addressVisibility).toBeUndefined()
  })

  it('výstup projde veřejným importním schématem', () => {
    expect(importListingSchema.safeParse(map()).success).toBe(true)
  })
})

describe('mapAdvertToImportInput — nekompletní data', () => {
  it('odmítne inzerát bez města', () => {
    expect(() => map({ locality_city: undefined })).toThrow(AdvertMappingError)
  })

  it('odmítne inzerát bez typu nabídky', () => {
    expect(() => map({ advert_function: undefined })).toThrow(/advert_function/)
  })

  it('odmítne neznámou kategorii', () => {
    expect(() => map({ advert_type: 99 })).toThrow(/advert_type/)
  })

  it('odmítne byt bez dispozice', () => {
    expect(() => map({ advert_subtype: undefined })).toThrow(/advert_subtype/)
  })

  it('odmítne cenu v cizí měně', () => {
    expect(() => map({ advert_price_currency: 3 })).toThrow(/jen cena v Kč/)
  })

  it('dům bez podkategorie projde — dispozici vyžadují jen byty', () => {
    expect(() => map({ advert_type: 2, advert_subtype: undefined })).not.toThrow()
  })
})
