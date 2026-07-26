/**
 * Taxonomie nemovitostí. ID hlavních kategorií jsou záměrně kompatibilní
 * se sreality (category_main_cb) — zjednoduší budoucí importy z realitních SW.
 */

export interface CategoryMain {
  id: number
  slug: string
  name: string
}

export interface CategorySub {
  id: number
  mainId: number
  slug: string
  name: string
  sort: number
}

export const CATEGORIES_MAIN: readonly CategoryMain[] = [
  { id: 1, slug: 'byty', name: 'Byty' },
  { id: 2, slug: 'domy', name: 'Domy' },
  { id: 3, slug: 'pozemky', name: 'Pozemky' },
  { id: 4, slug: 'komercni', name: 'Komerční' },
  { id: 5, slug: 'ostatni', name: 'Ostatní' },
] as const

export const CATEGORIES_SUB: readonly CategorySub[] = [
  // Domy
  { id: 201, mainId: 2, slug: 'rodinny-dum', name: 'Rodinný dům', sort: 1 },
  { id: 202, mainId: 2, slug: 'vila', name: 'Vila', sort: 2 },
  { id: 203, mainId: 2, slug: 'chalupa-chata', name: 'Chalupa / chata', sort: 3 },
  { id: 204, mainId: 2, slug: 'na-klic', name: 'Dům na klíč', sort: 4 },
  { id: 205, mainId: 2, slug: 'zemedelska-usedlost', name: 'Zemědělská usedlost', sort: 5 },
  // Pozemky
  { id: 301, mainId: 3, slug: 'stavebni-parcela', name: 'Stavební parcela', sort: 1 },
  { id: 302, mainId: 3, slug: 'komercni-pozemek', name: 'Komerční pozemek', sort: 2 },
  { id: 303, mainId: 3, slug: 'orna-puda', name: 'Orná půda', sort: 3 },
  { id: 304, mainId: 3, slug: 'les', name: 'Les', sort: 4 },
  { id: 305, mainId: 3, slug: 'zahrada', name: 'Zahrada', sort: 5 },
  { id: 306, mainId: 3, slug: 'louka', name: 'Louka', sort: 6 },
  { id: 307, mainId: 3, slug: 'rybnik', name: 'Rybník', sort: 7 },
  // Komerční
  { id: 401, mainId: 4, slug: 'kancelar', name: 'Kancelář', sort: 1 },
  { id: 402, mainId: 4, slug: 'sklad', name: 'Sklad', sort: 2 },
  { id: 403, mainId: 4, slug: 'vyroba', name: 'Výrobní prostor', sort: 3 },
  { id: 404, mainId: 4, slug: 'obchod', name: 'Obchodní prostor', sort: 4 },
  { id: 405, mainId: 4, slug: 'ubytovani', name: 'Ubytování', sort: 5 },
  { id: 406, mainId: 4, slug: 'restaurace', name: 'Restaurace', sort: 6 },
  { id: 407, mainId: 4, slug: 'ordinace', name: 'Ordinace', sort: 7 },
  { id: 408, mainId: 4, slug: 'virtualni-kancelar', name: 'Virtuální kancelář', sort: 8 },
  // Ostatní
  { id: 501, mainId: 5, slug: 'garaz', name: 'Garáž', sort: 1 },
  { id: 502, mainId: 5, slug: 'garazove-stani', name: 'Garážové stání', sort: 2 },
  { id: 503, mainId: 5, slug: 'vinny-sklep', name: 'Vinný sklep', sort: 3 },
  { id: 504, mainId: 5, slug: 'mobilheim', name: 'Mobilheim', sort: 4 },
  { id: 505, mainId: 5, slug: 'pamatka', name: 'Památka / jiné', sort: 5 },
] as const

export const CATEGORY_MAIN_BY_SLUG = new Map(CATEGORIES_MAIN.map((c) => [c.slug, c]))
export const CATEGORY_MAIN_BY_ID = new Map(CATEGORIES_MAIN.map((c) => [c.id, c]))
export const CATEGORY_SUB_BY_ID = new Map(CATEGORIES_SUB.map((c) => [c.id, c]))

export function subcategoriesOf(mainId: number): CategorySub[] {
  return CATEGORIES_SUB.filter((c) => c.mainId === mainId).sort((a, b) => a.sort - b.sort)
}

/** Byty nemají podkategorie — třetí úroveň taxonomie je dispozice. */
export const CATEGORY_BYTY_ID = 1
