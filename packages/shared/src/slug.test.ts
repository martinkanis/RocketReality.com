import { describe, expect, it } from 'vitest'
import { buildListingSlug, encodeBase36, parseListingSlugSeq, slugify } from './slug'

describe('slugify', () => {
  it('odstraní diakritiku a nahradí mezery pomlčkami', () => {
    expect(slugify('Světlý byt 2+kk — Brno-Veveří')).toBe('svetly-byt-2-kk-brno-veveri')
  })

  it('ořízne úvodní a koncové pomlčky', () => {
    expect(slugify('  Ústí nad Labem  ')).toBe('usti-nad-labem')
  })
})

describe('encodeBase36', () => {
  it('kóduje čísla do base36', () => {
    expect(encodeBase36(0)).toBe('0')
    expect(encodeBase36(35)).toBe('z')
    expect(encodeBase36(36)).toBe('10')
  })

  it('odmítne záporné číslo', () => {
    expect(() => encodeBase36(-1)).toThrow()
  })
})

describe('buildListingSlug + parseListingSlugSeq', () => {
  it('slug končí base36 kódem sekvence a dá se zpětně přečíst', () => {
    const slug = buildListingSlug('Prodej bytu 2+kk 54 m², Brno', 12345)
    expect(slug).toBe('prodej-bytu-2-kk-54-m-brno-9ix')
    expect(parseListingSlugSeq(slug)).toBe(12345)
  })

  it('vrací null pro slug bez kódu', () => {
    expect(parseListingSlugSeq('nesmysl')).toBeNull()
  })
})
