import { describe, expect, it } from 'vitest'
import { buildSpayd, isValidIban, parseSpayd } from './spayd'

// Validní český testovací IBAN (mod 97 = 1).
const VALID_IBAN = 'CZ6508000000192000145399'

describe('isValidIban', () => {
  it('přijme validní český IBAN', () => {
    expect(isValidIban(VALID_IBAN)).toBe(true)
    expect(isValidIban('cz65 0800 0000 1920 0014 5399')).toBe(true)
  })

  it('odmítne IBAN s chybným kontrolním součtem', () => {
    expect(isValidIban('CZ6608000000192000145399')).toBe(false)
  })

  it('odmítne nesmysly', () => {
    expect(isValidIban('')).toBe(false)
    expect(isValidIban('123')).toBe(false)
    expect(isValidIban('XXXXXXXXXXXX')).toBe(false)
  })
})

describe('parseSpayd', () => {
  it('parsuje kompletní SPAYD', () => {
    const result = parseSpayd(`SPD*1.0*ACC:${VALID_IBAN}+GIBACZPX*AM:450.00*CC:CZK*MSG:PLATBA`)
    expect(result).not.toBeNull()
    expect(result?.iban).toBe(VALID_IBAN)
    expect(result?.bic).toBe('GIBACZPX')
    expect(result?.amount).toBe(450)
    expect(result?.currency).toBe('CZK')
    expect(result?.message).toBe('PLATBA')
  })

  it('vrací null pro ne-SPAYD text', () => {
    expect(parseSpayd('https://example.com')).toBeNull()
    expect(parseSpayd('')).toBeNull()
  })

  it('vrací null pro SPAYD s nevalidním IBAN', () => {
    expect(parseSpayd('SPD*1.0*ACC:CZ0000000000000000000000*AM:100')).toBeNull()
  })

  it('zvládne SPAYD bez částky', () => {
    const result = parseSpayd(`SPD*1.0*ACC:${VALID_IBAN}`)
    expect(result?.amount).toBeNull()
  })
})

describe('buildSpayd', () => {
  it('sestaví SPAYD pro výplatu odměny', () => {
    expect(buildSpayd({ iban: VALID_IBAN, amountCzk: 25, message: 'Odmena RocketReality' })).toBe(
      `SPD*1.0*ACC:${VALID_IBAN}*AM:25.00*CC:CZK*MSG:Odmena RocketReality`,
    )
  })

  it('odmítne nevalidní IBAN a částku', () => {
    expect(() => buildSpayd({ iban: 'CZ00', amountCzk: 25 })).toThrow()
    expect(() => buildSpayd({ iban: VALID_IBAN, amountCzk: 0 })).toThrow()
  })
})
