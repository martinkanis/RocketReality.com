import { CATEGORIES_MAIN, CATEGORIES_SUB } from '@rocket/shared'
import { DEFAULT_PRODUCTS } from '@rocket/config'
import { sql } from 'drizzle-orm'
import type { Database } from '../client'
import { categoriesMain, categoriesSub, districts, municipalities, products } from '../schema/index'
import { DISTRICT_SEED } from './data/districts'
import { MUNICIPALITY_SEED } from './data/municipalities'

/** Idempotentní seed číselníků — bezpečné spustit opakovaně. */
export async function seedCatalogs(db: Database): Promise<void> {
  await db
    .insert(categoriesMain)
    .values(CATEGORIES_MAIN.map(({ id, slug, name }) => ({ id, slug, name })))
    .onConflictDoUpdate({
      target: categoriesMain.id,
      set: { slug: sql`excluded.slug`, name: sql`excluded.name` },
    })

  await db
    .insert(categoriesSub)
    .values(
      CATEGORIES_SUB.map(({ id, mainId, slug, name, sort }) => ({ id, mainId, slug, name, sort })),
    )
    .onConflictDoUpdate({
      target: categoriesSub.id,
      set: { slug: sql`excluded.slug`, name: sql`excluded.name`, sort: sql`excluded.sort` },
    })

  await db
    .insert(districts)
    .values(DISTRICT_SEED.map(({ id, kraj, name, slug }) => ({ id, kraj, name, slug })))
    .onConflictDoUpdate({
      target: districts.id,
      set: { kraj: sql`excluded.kraj`, name: sql`excluded.name`, slug: sql`excluded.slug` },
    })

  const districtIdBySlug = new Map(DISTRICT_SEED.map((d) => [d.slug, d.id]))
  await db
    .insert(municipalities)
    .values(
      MUNICIPALITY_SEED.map((m) => {
        const districtId = districtIdBySlug.get(m.districtSlug)
        if (!districtId) {
          throw new Error(`Neznámý okres '${m.districtSlug}' u obce '${m.name}'`)
        }
        return {
          districtId,
          name: m.name,
          slug: m.slug,
          centroid: { x: m.lng, y: m.lat },
        }
      }),
    )
    .onConflictDoNothing({ target: municipalities.slug })

  await db
    .insert(products)
    .values(
      DEFAULT_PRODUCTS.map((p) => ({
        code: p.code,
        name: p.name,
        price: p.priceCzk,
        durationDays: p.durationDays,
      })),
    )
    .onConflictDoNothing({ target: products.code })
}
