import { describe, expect, it } from 'vitest'
import { canArchiveWithReason, withdrawalLockedUntil } from './withdrawal-lock'

const publishedAt = new Date('2026-08-01T10:00:00Z')
const duringLock = new Date('2026-08-10T10:00:00Z')
const afterLock = new Date('2026-11-05T10:00:00Z')

describe('canArchiveWithReason', () => {
  it('prodáno a pronajato jde vždy, i v zámku', () => {
    expect(canArchiveWithReason('prodano', publishedAt, duringLock)).toBe(true)
    expect(canArchiveWithReason('pronajato', publishedAt, duringLock)).toBe(true)
  })

  it('stažení inzerentem v zámku nejde', () => {
    expect(canArchiveWithReason('stazeno_inzerentem', publishedAt, duringLock)).toBe(false)
    expect(canArchiveWithReason('jine', publishedAt, duringLock)).toBe(false)
  })

  it('po uplynutí zámku jde stáhnout z libovolného důvodu', () => {
    expect(canArchiveWithReason('stazeno_inzerentem', publishedAt, afterLock)).toBe(true)
    expect(canArchiveWithReason('jine', publishedAt, afterLock)).toBe(true)
  })

  it('nezveřejněný inzerát zámek nemá', () => {
    expect(canArchiveWithReason('stazeno_inzerentem', null, duringLock)).toBe(true)
  })
})

describe('withdrawalLockedUntil', () => {
  it('zámek trvá 30 dní od zveřejnění', () => {
    expect(withdrawalLockedUntil(publishedAt)).toEqual(new Date('2026-08-31T10:00:00Z'))
  })

  it('bez zveřejnění není zámek', () => {
    expect(withdrawalLockedUntil(null)).toBeNull()
  })
})
