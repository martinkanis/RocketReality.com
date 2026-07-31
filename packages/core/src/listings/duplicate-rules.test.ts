import { describe, expect, it } from 'vitest'
import {
  evaluateDuplicate,
  findBestDuplicate,
  type DuplicateCandidate,
  type DuplicateSubject,
} from './duplicate-rules'

const subject: DuplicateSubject = { areaUsable: 60, street: 'Botanická 68' }

function candidate(overrides: Partial<DuplicateCandidate> = {}): DuplicateCandidate {
  return {
    listingId: 'kandidat-1',
    areaUsable: 60,
    street: 'Botanická 68',
    distanceMeters: 20,
    sharesPhoto: false,
    ...overrides,
  }
}

describe('evaluateDuplicate', () => {
  it('shodná fotografie stačí i bez ostatních shod', () => {
    const match = evaluateDuplicate(subject, {
      ...candidate({ sharesPhoto: true, areaUsable: 200, street: 'Jiná ulice' }),
      distanceMeters: 5_000,
    })

    expect(match?.reason).toBe('shodná fotografie')
  })

  it('shodná adresa a plocha znamená duplicitu', () => {
    expect(evaluateDuplicate(subject, candidate({ distanceMeters: null }))?.reason).toBe(
      'shodná adresa i plocha',
    )
  })

  it('adresu porovnává bez diakritiky a velikosti písmen', () => {
    const match = evaluateDuplicate(subject, candidate({ street: 'BOTANICKA  68' }))

    expect(match?.reason).toBe('shodná adresa i plocha')
  })

  it('blízká poloha a shodná plocha znamená duplicitu i bez adresy', () => {
    const match = evaluateDuplicate(subject, candidate({ street: null, distanceMeters: 40 }))

    expect(match?.reason).toBe('shodná poloha i plocha')
  })

  it('vzdálenější nabídka se stejnou plochou duplicita není', () => {
    expect(evaluateDuplicate(subject, candidate({ street: null, distanceMeters: 500 }))).toBeNull()
  })

  it('jiná plocha na stejné adrese duplicita není — v domě je bytů víc', () => {
    expect(evaluateDuplicate(subject, candidate({ areaUsable: 95 }))).toBeNull()
  })

  it('plocha v toleranci pěti procent projde, větší rozdíl ne', () => {
    expect(evaluateDuplicate(subject, candidate({ areaUsable: 62 }))).not.toBeNull()
    expect(evaluateDuplicate(subject, candidate({ areaUsable: 70 }))).toBeNull()
  })

  it('bez znalosti plochy se na shodu jen podle adresy nespoléhá', () => {
    expect(evaluateDuplicate({ ...subject, areaUsable: null }, candidate())).toBeNull()
    expect(evaluateDuplicate(subject, candidate({ areaUsable: null }))).toBeNull()
  })
})

describe('findBestDuplicate', () => {
  it('shodná fotografie má přednost před shodou polohy', () => {
    const match = findBestDuplicate(subject, [
      candidate({ listingId: 'podle-polohy', street: null, distanceMeters: 30 }),
      candidate({ listingId: 'podle-fotky', sharesPhoto: true }),
    ])

    expect(match?.listingId).toBe('podle-fotky')
  })

  it('bez shody vrací null', () => {
    expect(findBestDuplicate(subject, [candidate({ areaUsable: 200, street: null })])).toBeNull()
  })

  it('prázdný seznam kandidátů vrací null', () => {
    expect(findBestDuplicate(subject, [])).toBeNull()
  })
})
