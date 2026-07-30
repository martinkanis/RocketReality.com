import { describe, expect, it } from 'vitest'
import { and, type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { buildSearchConditions, buildSearchOrderBy } from './postgres-search'
import { searchQuerySchema } from './query'

const dialect = new PgDialect({ casing: 'snake_case' })
const BYTY_CATEGORY_ID = 1

function renderConditions(overrides: Record<string, unknown> = {}) {
  const query = searchQuerySchema.parse({
    transaction: 'prodej',
    categoryMain: 'byty',
    ...overrides,
  })
  const where = and(...buildSearchConditions(query, BYTY_CATEGORY_ID)) as SQL
  return dialect.sqlToQuery(where)
}

describe('buildSearchConditions — pole-filtry', () => {
  it('dispozice generuje IN s jedním parametrem na hodnotu, ne = ANY(($1, $2))', () => {
    const { sql, params } = renderConditions({ disposition: ['2+kk', '3+kk'] })

    expect(sql).not.toMatch(/= ANY/i)
    expect(sql).toMatch(/"disposition" in \(\$\d+, \$\d+\)/)
    expect(params).toContain('2+kk')
    expect(params).toContain('3+kk')
  })

  it('ownership, buildingType, buildingCondition i furnishing generují IN', () => {
    const { sql, params } = renderConditions({
      ownership: ['osobni'],
      buildingType: ['cihlova'],
      buildingCondition: ['dobry'],
      furnishing: ['zarizeno'],
    })

    expect(sql).not.toMatch(/= ANY/i)
    for (const column of ['ownership', 'building_type', 'building_condition', 'furnishing']) {
      expect(sql).toMatch(new RegExp(`"${column}" in \\(\\$\\d+\\)`))
    }
    expect(params).toEqual(expect.arrayContaining(['osobni', 'cihlova', 'dobry', 'zarizeno']))
  })
})

describe('buildSearchOrderBy — řazení podle ceny', () => {
  function renderOrderBy(sort: string) {
    const query = searchQuerySchema.parse({ transaction: 'prodej', categoryMain: 'byty', sort })
    return buildSearchOrderBy(query).map((part) => dialect.sqlToQuery(part).sql)
  }

  it('nejlevnejsi generuje ASC NULLS LAST, ne NULLS LAST asc', () => {
    const [, priceOrder] = renderOrderBy('nejlevnejsi')

    expect(priceOrder).toMatch(/"price_amount" ASC NULLS LAST$/)
    expect(priceOrder).not.toMatch(/NULLS LAST\s+(asc|desc)/i)
  })

  it('nejdrazsi generuje DESC NULLS LAST, ne NULLS LAST desc', () => {
    const [, priceOrder] = renderOrderBy('nejdrazsi')

    expect(priceOrder).toMatch(/"price_amount" DESC NULLS LAST$/)
    expect(priceOrder).not.toMatch(/NULLS LAST\s+(asc|desc)/i)
  })

  it('výchozí řazení zůstává podle publishedAt sestupně', () => {
    const [toppedFirst, published] = renderOrderBy('nejnovejsi')

    expect(toppedFirst).toMatch(/"topped_until" > now\(\) desc/)
    expect(published).toMatch(/"published_at" desc/)
  })
})
