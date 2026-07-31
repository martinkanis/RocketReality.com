import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddressSearchError, CuzkAddressSearch, parseAddressLabel } from './address-search'

describe('parseAddressLabel', () => {
  it('rozloží adresu s částí obce', () => {
    expect(parseAddressLabel('Botanická 934/68, Veveří, 60200 Brno')).toEqual({
      street: 'Botanická 934/68',
      municipality: 'Brno',
      postalCode: '60200',
    })
  })

  it('rozloží adresu bez části obce', () => {
    expect(parseAddressLabel('Javorová 18, 74601 Opava')).toEqual({
      street: 'Javorová 18',
      municipality: 'Opava',
      postalCode: '74601',
    })
  })

  it('zvládne PSČ psané s mezerou', () => {
    expect(parseAddressLabel('Krátká 5, 602 00 Brno').postalCode).toBe('60200')
  })

  it('bez PSČ vezme poslední část jako obec', () => {
    expect(parseAddressLabel('Náves 3, Malá Morava')).toEqual({
      street: 'Náves 3',
      municipality: 'Malá Morava',
      postalCode: null,
    })
  })

  it('obec s číslicí v názvu nepovažuje za PSČ', () => {
    expect(parseAddressLabel('Hlavní 1, Praha 6').postalCode).toBeNull()
  })
})

describe('CuzkAddressSearch.suggest', () => {
  const search = new CuzkAddressSearch()

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(payload: unknown, ok = true) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('krátký dotaz se do registru vůbec neposílá', async () => {
    const fetchMock = stubFetch({})

    expect(await search.suggest('Br')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('vrátí našeptané adresy', async () => {
    stubFetch({
      suggestions: [
        { text: 'Botanická 934/68, Veveří, 60200 Brno', magicKey: 'abc', type: 'AdresniMisto' },
      ],
    })

    expect(await search.suggest('Botanická 68')).toEqual([
      { label: 'Botanická 934/68, Veveří, 60200 Brno', key: 'abc' },
    ])
  })

  it('vynechá jiné typy než adresní místo — ulice bez čísla nemá přesný bod', async () => {
    stubFetch({
      suggestions: [
        { text: 'Botanická, Brno', magicKey: 'ulice', type: 'Ulice' },
        { text: 'Botanická 934/68, Brno', magicKey: 'adresa', type: 'AdresniMisto' },
      ],
    })

    const results = await search.suggest('Botanická')

    expect(results).toHaveLength(1)
    expect(results[0]?.key).toBe('adresa')
  })

  it('výpadek registru hlásí chybou, ne prázdným výsledkem', async () => {
    stubFetch({}, false)

    await expect(search.suggest('Botanická 68')).rejects.toThrow(AddressSearchError)
  })
})

describe('CuzkAddressSearch.resolve', () => {
  const search = new CuzkAddressSearch()

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('vrátí souřadnice i rozloženou adresu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              address: 'Botanická 934/68, Veveří, 60200 Brno',
              location: { x: 16.5988, y: 49.2092 },
            },
          ],
        }),
      }),
    )

    expect(await search.resolve({ key: 'abc', label: 'Botanická 68' })).toEqual({
      label: 'Botanická 934/68, Veveří, 60200 Brno',
      street: 'Botanická 934/68',
      municipality: 'Brno',
      postalCode: '60200',
      lat: 49.2092,
      lng: 16.5988,
    })
  })

  it('bez kandidáta vrací null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [] }) }),
    )

    expect(await search.resolve({ key: 'abc', label: 'Neexistuje' })).toBeNull()
  })
})
