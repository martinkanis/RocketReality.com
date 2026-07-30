import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  computeNextSessionId,
  createImportPassword,
  createSessionId,
  getFixedPart,
  hashImportPassword,
  matchesExpectedSessionId,
} from './session'

const credentials = { passwordMd5: hashImportPassword('tajne-heslo'), softwareKey: 'SW-KEY-1' }

describe('createSessionId', () => {
  it('má 48znakovou fixní část a je pokaždé jiné', () => {
    const first = createSessionId()
    const second = createSessionId()

    expect(getFixedPart(first)).toHaveLength(48)
    expect(first).not.toBe(second)
  })
})

describe('computeNextSessionId', () => {
  it('drží fixní část a mění jen variabilní', () => {
    const current = createSessionId()
    const next = computeNextSessionId(current, credentials)

    expect(getFixedPart(next)).toBe(getFixedPart(current))
    expect(next).not.toBe(current)
  })

  it('odpovídá postupu předepsanému protokolem', () => {
    const current = createSessionId()
    const expectedVariablePart = createHash('md5')
      .update(current + credentials.passwordMd5 + credentials.softwareKey, 'utf8')
      .digest('hex')

    expect(computeNextSessionId(current, credentials)).toBe(
      getFixedPart(current) + expectedVariablePart,
    )
  })

  it('řetězí se — každý krok vychází z předchozí hodnoty', () => {
    const first = createSessionId()
    const second = computeNextSessionId(first, credentials)
    const third = computeNextSessionId(second, credentials)

    expect(third).not.toBe(second)
    expect(getFixedPart(third)).toBe(getFixedPart(first))
  })
})

describe('matchesExpectedSessionId', () => {
  it('přijme hodnotu spočtenou stejným heslem a klíčem softwaru', () => {
    const current = createSessionId()
    const provided = computeNextSessionId(current, credentials)

    expect(matchesExpectedSessionId(provided, current, credentials)).toBe(true)
  })

  it('odmítne hodnotu spočtenou jiným heslem', () => {
    const current = createSessionId()
    const provided = computeNextSessionId(current, {
      ...credentials,
      passwordMd5: hashImportPassword('jine-heslo'),
    })

    expect(matchesExpectedSessionId(provided, current, credentials)).toBe(false)
  })

  it('odmítne hodnotu spočtenou jiným klíčem softwaru', () => {
    const current = createSessionId()
    const provided = computeNextSessionId(current, { ...credentials, softwareKey: 'SW-KEY-2' })

    expect(matchesExpectedSessionId(provided, current, credentials)).toBe(false)
  })

  it('odmítne zopakovanou předchozí hodnotu', () => {
    const current = createSessionId()

    expect(matchesExpectedSessionId(current, current, credentials)).toBe(false)
  })

  it('odmítne hodnotu jiné délky bez pádu', () => {
    const current = createSessionId()

    expect(matchesExpectedSessionId('kratke', current, credentials)).toBe(false)
  })
})

describe('createImportPassword', () => {
  it('generuje náhodné heslo, uživatel si ho nevolí', () => {
    expect(createImportPassword()).not.toBe(createImportPassword())
    expect(createImportPassword()).toHaveLength(32)
  })
})
