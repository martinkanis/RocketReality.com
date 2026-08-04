import { describe, expect, it } from 'vitest'

import { matchMunicipalityByPart } from './service'

/**
 * Obce z číselníku, které se v testech potkávají. Stačí názvy — hledání
 * obvodu pracuje jen s nimi.
 */
const MUNICIPALITIES = [
  'Ostrava',
  'Praha',
  'Brno',
  'Plzeň',
  'Ústí nad Labem',
  'Ústí nad Orlicí',
  'Ústí',
  'Karviná',
  'Ves',
  'Nová Ves',
  'Lom',
].map((name) => ({ name }))

const matchedName = (city: string): string | undefined =>
  matchMunicipalityByPart(MUNICIPALITIES, city)[0]?.name

describe('rozpoznání obce z názvu městského obvodu', () => {
  it('najde Ostravu v názvu jejího obvodu', () => {
    expect(matchedName('Moravská Ostrava a Přívoz')).toBe('Ostrava')
  })

  it('zvládne obvod zapsaný s pomlčkou', () => {
    expect(matchedName('Brno-střed')).toBe('Brno')
  })

  it('zvládne obvod zapsaný číslem', () => {
    expect(matchedName('Praha 4')).toBe('Praha')
    expect(matchedName('Plzeň 3')).toBe('Plzeň')
  })

  it('nezáleží na diakritice ani na velikosti písmen', () => {
    expect(matchedName('OSTRAVA-PORUBA')).toBe('Ostrava')
    expect(matchedName('moravska ostrava')).toBe('Ostrava')
  })

  it('vybere nejdelší shodu, aby kratší obec nepřebila delší', () => {
    expect(matchedName('Ústí nad Labem-město')).toBe('Ústí nad Labem')
    expect(matchedName('Nová Ves u Kolína')).toBe('Nová Ves')
  })

  it('nechytí název obce uvnitř jiného slova', () => {
    expect(matchedName('Lomnice nad Popelkou')).toBeUndefined()
    expect(matchedName('Vesec')).toBeUndefined()
  })

  it('nechytí obec ve tvaru, který není samostatné slovo', () => {
    expect(matchedName('Petrovice u Karviné')).toBeUndefined()
  })

  it('vrátí prázdný výsledek, když se nic nepodobá', () => {
    expect(matchMunicipalityByPart(MUNICIPALITIES, 'Neexistující místo')).toHaveLength(0)
  })
})
