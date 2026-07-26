import {
  buildListingSlug,
  CATEGORY_BYTY_ID,
  DISPOSITIONS,
  type Disposition,
  type TransactionType,
} from '@rocket/shared'
import { hashPassword } from 'better-auth/crypto'
import { eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '../client'
import {
  accounts,
  agencies,
  agencyMembers,
  districts,
  favorites,
  listings,
  moderationCases,
  municipalities,
  savedSearches,
  users,
} from '../schema/index'

/** Deterministický PRNG (mulberry32) — stejný seed = stejná demo data. */
function createRng(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEMO_PASSWORD = 'Heslo123!'

interface DemoUser {
  id: string
  email: string
  name: string
  accountType: 'soukromnik' | 'profesional'
  role: 'user' | 'superadmin'
}

const DEMO_USERS: readonly DemoUser[] = [
  {
    id: 'user-admin',
    email: 'admin@rocketreality.cz',
    name: 'Správce Portálu',
    accountType: 'profesional',
    role: 'superadmin',
  },
  {
    id: 'user-jana',
    email: 'jana@realityvltava.cz',
    name: 'Jana Dvořáková',
    accountType: 'profesional',
    role: 'user',
  },
  {
    id: 'user-tomas',
    email: 'tomas@realityvltava.cz',
    name: 'Tomáš Beneš',
    accountType: 'profesional',
    role: 'user',
  },
  {
    id: 'user-petr',
    email: 'petr@moravareality.cz',
    name: 'Petr Horák',
    accountType: 'profesional',
    role: 'user',
  },
  {
    id: 'user-lucie',
    email: 'lucie@moravareality.cz',
    name: 'Lucie Malá',
    accountType: 'profesional',
    role: 'user',
  },
  {
    id: 'user-karel',
    email: 'karel@example.cz',
    name: 'Karel Novák',
    accountType: 'soukromnik',
    role: 'user',
  },
  {
    id: 'user-eva',
    email: 'eva@example.cz',
    name: 'Eva Svobodová',
    accountType: 'soukromnik',
    role: 'user',
  },
  {
    id: 'user-milan',
    email: 'milan@example.cz',
    name: 'Milan Černý',
    accountType: 'soukromnik',
    role: 'user',
  },
] as const

async function seedUsers(db: Database): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  for (const demoUser of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        emailVerified: true,
        accountType: demoUser.accountType,
        role: demoUser.role,
      })
      .onConflictDoNothing({ target: users.id })
    await db
      .insert(accounts)
      .values({
        id: `${demoUser.id}-credential`,
        accountId: demoUser.id,
        providerId: 'credential',
        userId: demoUser.id,
        password: passwordHash,
      })
      .onConflictDoNothing({ target: accounts.id })
  }
}

interface DemoAgency {
  slug: string
  name: string
  ico: string
  city: string
  description: string
  ownerUserId: string
  brokerUserId: string
}

const DEMO_AGENCIES: readonly DemoAgency[] = [
  {
    slug: 'reality-vltava',
    name: 'Reality Vltava s.r.o.',
    ico: '45678901',
    city: 'Praha',
    description:
      'Realitní kancelář s dvacetiletou praxí v Praze a Středočeském kraji. Specializujeme se na prodej bytů a rodinných domů.',
    ownerUserId: 'user-jana',
    brokerUserId: 'user-tomas',
  },
  {
    slug: 'morava-reality',
    name: 'Morava Reality a.s.',
    ico: '98765432',
    city: 'Brno',
    description:
      'Jsme jednička na jižní Moravě. Prodej i pronájem nemovitostí, kompletní právní servis a výkup nemovitostí.',
    ownerUserId: 'user-petr',
    brokerUserId: 'user-lucie',
  },
] as const

async function seedAgencies(db: Database): Promise<Map<string, string>> {
  const agencyIdBySlug = new Map<string, string>()
  for (const demoAgency of DEMO_AGENCIES) {
    const [row] = await db
      .insert(agencies)
      .values({
        name: demoAgency.name,
        slug: demoAgency.slug,
        ico: demoAgency.ico,
        city: demoAgency.city,
        description: demoAgency.description,
        email: `info@${demoAgency.slug.replace(/-/g, '')}.cz`,
        phone: '+420 777 123 456',
      })
      .onConflictDoUpdate({ target: agencies.slug, set: { name: sql`excluded.name` } })
      .returning({ id: agencies.id })
    if (!row) throw new Error(`Seed RK '${demoAgency.slug}' nevrátil id`)
    agencyIdBySlug.set(demoAgency.slug, row.id)

    await db
      .insert(agencyMembers)
      .values([
        { agencyId: row.id, userId: demoAgency.ownerUserId, role: 'owner', acceptedAt: new Date() },
        {
          agencyId: row.id,
          userId: demoAgency.brokerUserId,
          role: 'makler',
          acceptedAt: new Date(),
        },
      ])
      .onConflictDoNothing()
  }
  return agencyIdBySlug
}

const APARTMENT_DISPOSITIONS: readonly Disposition[] = [
  '1+kk',
  '1+1',
  '2+kk',
  '2+1',
  '3+kk',
  '3+1',
  '4+kk',
  '4+1',
]

const STREETS = [
  'Nádražní',
  'Školní',
  'Zahradní',
  'Polní',
  'Krátká',
  'Dlouhá',
  'Sadová',
  'Lipová',
  'Husova',
  'Masarykova',
]

const DESCRIPTION_INTROS = [
  'Nabízíme k prodeji světlou a prostornou nemovitost v žádané lokalitě.',
  'Exkluzivně nabízíme nemovitost v klidné části obce s výbornou občanskou vybaveností.',
  'Do nabídky zařazujeme udržovanou nemovitost s dobrou dopravní dostupností.',
  'Představujeme vám nemovitost, která kombinuje pohodlné bydlení a skvělou polohu.',
]

const DESCRIPTION_DETAILS = [
  'V okolí najdete kompletní občanskou vybavenost — školy, školky, obchody i lékaře.',
  'Zastávka MHD je vzdálená pár minut chůze, napojení na hlavní tah je rychlé a pohodlné.',
  'Nemovitost je ihned k dispozici, financování pomůžeme zajistit.',
  'Doporučujeme osobní prohlídku, která vás přesvědčí o kvalitách této nabídky.',
]

interface MunicipalityRow {
  id: number
  districtId: number
  kraj: (typeof districts.$inferSelect)['kraj']
  name: string
  lat: number
  lng: number
}

/** Demo inzeráty: 3 na obec, deterministické, trigger sám zapíše price_history. */
async function seedListings(db: Database, agencyIds: string[]): Promise<void> {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(listings)
  if ((existing[0]?.count ?? 0) > 0) return

  const municipalityRows = await db
    .select({
      id: municipalities.id,
      districtId: municipalities.districtId,
      kraj: districts.kraj,
      name: municipalities.name,
      lat: sql<number>`ST_Y(${municipalities.centroid})`,
      lng: sql<number>`ST_X(${municipalities.centroid})`,
    })
    .from(municipalities)
    .innerJoin(districts, eq(municipalities.districtId, districts.id))

  const rng = createRng(20260726)
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(rng() * items.length)]
    if (item === undefined) throw new Error('pick z prázdného pole')
    return item
  }
  const [vltavaId, moravaId] = agencyIds
  if (!vltavaId || !moravaId) throw new Error('Seed očekává dvě RK')
  const owners = ['user-karel', 'user-eva', 'user-milan']
  const brokers = [
    { userId: 'user-jana', agencyId: vltavaId },
    { userId: 'user-tomas', agencyId: vltavaId },
    { userId: 'user-petr', agencyId: moravaId },
    { userId: 'user-lucie', agencyId: moravaId },
  ]

  for (const municipality of municipalityRows as MunicipalityRow[]) {
    for (let i = 0; i < 3; i++) {
      const roll = rng()
      const categoryMainId = roll < 0.5 ? 1 : roll < 0.75 ? 2 : roll < 0.85 ? 3 : roll < 0.95 ? 4 : 5
      const transaction: TransactionType = rng() < 0.7 ? 'prodej' : 'pronajem'
      const disposition =
        categoryMainId === CATEGORY_BYTY_ID ? pick(APARTMENT_DISPOSITIONS) : null
      const categorySubId =
        categoryMainId === 2
          ? 201
          : categoryMainId === 3
            ? 301
            : categoryMainId === 4
              ? 401
              : categoryMainId === 5
                ? 501
                : null

      const area =
        categoryMainId === 3
          ? Math.round(400 + rng() * 2000)
          : Math.round(30 + rng() * 150)
      const pricePerM2 =
        transaction === 'prodej' ? 40_000 + rng() * 80_000 : 150 + rng() * 250
      const priceAmount = Math.round((area * pricePerM2) / 1000) * 1000

      const typeName =
        categoryMainId === 1
          ? `bytu ${disposition ?? ''}`
          : categoryMainId === 2
            ? 'rodinného domu'
            : categoryMainId === 3
              ? 'pozemku'
              : categoryMainId === 4
                ? 'komerčního prostoru'
                : 'garáže'
      const transactionName = transaction === 'prodej' ? 'Prodej' : 'Pronájem'
      const title = `${transactionName} ${typeName} ${area} m², ${municipality.name}`

      const statusRoll = rng()
      const status =
        statusRoll < 0.8
          ? 'active'
          : statusRoll < 0.86
            ? 'draft'
            : statusRoll < 0.92
              ? 'pending_review'
              : statusRoll < 0.96
                ? 'expired'
                : 'archived'

      const useAgency = rng() < 0.6
      const broker = pick(brokers)
      const ownerUserId = useAgency ? broker.userId : pick(owners)
      const agencyId = useAgency ? broker.agencyId : null

      const publishedDaysAgo = Math.floor(rng() * 55)
      const publishedAt =
        status === 'draft' ? null : new Date(Date.now() - publishedDaysAgo * 24 * 3600 * 1000)
      const validUntil =
        status === 'active' && publishedAt
          ? new Date(publishedAt.getTime() + 30 * 24 * 3600 * 1000 + 60 * 24 * 3600 * 1000)
          : status === 'expired' && publishedAt
            ? new Date(Date.now() - 24 * 3600 * 1000)
            : null

      const description = `${pick(DESCRIPTION_INTROS)} ${pick(DESCRIPTION_DETAILS)} ${pick(DESCRIPTION_DETAILS)}`

      const [inserted] = await db
        .insert(listings)
        .values({
          slug: `tmp-${uuidv7()}`,
          ownerUserId,
          agencyId,
          transaction,
          categoryMainId,
          categorySubId,
          disposition,
          title,
          description,
          priceAmount,
          priceUnit: transaction === 'pronajem' ? 'za_mesic' : 'celkem',
          monthlyFees: transaction === 'pronajem' ? Math.round(2000 + rng() * 3000) : null,
          deposit: transaction === 'pronajem' ? priceAmount : null,
          areaUsable: categoryMainId === 3 ? null : area,
          areaLand: categoryMainId === 3 ? area : null,
          floorNumber: categoryMainId === 1 ? Math.floor(rng() * 8) : null,
          floorsTotal: categoryMainId === 1 ? 8 : categoryMainId === 2 ? 2 : null,
          ownership: rng() < 0.85 ? 'osobni' : 'druzstevni',
          buildingType: categoryMainId === 3 ? null : rng() < 0.6 ? 'cihlova' : 'panelova',
          buildingCondition: pick(['novostavba', 'velmi_dobry', 'dobry', 'po_rekonstrukci'] as const),
          furnishing: transaction === 'pronajem' ? pick(['zarizeno', 'castecne_zarizeno', 'nezarizeno'] as const) : null,
          energyLabel: pick(['B', 'C', 'C', 'D', 'D', 'E', 'G'] as const),
          hasBalcony: categoryMainId === 1 && rng() < 0.5,
          hasCellar: rng() < 0.4,
          hasElevator: categoryMainId === 1 && rng() < 0.6,
          hasParking: rng() < 0.5,
          hasGarage: categoryMainId === 2 && rng() < 0.5,
          attributes:
            categoryMainId === 3
              ? { elektrina: rng() < 0.8, voda: rng() < 0.6, plyn: rng() < 0.4, kanalizace: rng() < 0.5 }
              : {},
          kraj: municipality.kraj,
          districtId: municipality.districtId,
          municipalityId: municipality.id,
          street: pick(STREETS),
          locationPoint: {
            x: municipality.lng + (rng() - 0.5) * 0.05,
            y: municipality.lat + (rng() - 0.5) * 0.05,
          },
          addressVisibility: rng() < 0.7 ? 'presna' : 'obec',
          status,
          publishedAt,
          validUntil,
          archiveReason: status === 'archived' ? 'prodano' : null,
          toppedUntil:
            status === 'active' && rng() < 0.08
              ? new Date(Date.now() + 5 * 24 * 3600 * 1000)
              : null,
          viewCount: Math.floor(rng() * 900),
        })
        .returning({ id: listings.id, seq: listings.seq })
      if (!inserted) throw new Error('Insert inzerátu nevrátil řádek')

      await db
        .update(listings)
        .set({ slug: buildListingSlug(title, inserted.seq) })
        .where(eq(listings.id, inserted.id))

      if (status === 'pending_review') {
        await db.insert(moderationCases).values({ listingId: inserted.id })
      }
    }
  }
}

async function seedEngagement(db: Database): Promise<void> {
  const activeListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.status, 'active'))
    .limit(5)

  for (const listing of activeListings.slice(0, 3)) {
    await db
      .insert(favorites)
      .values({ userId: 'user-karel', listingId: listing.id, note: 'Zajímavé, zavolat majiteli.' })
      .onConflictDoNothing()
  }

  await db
    .insert(savedSearches)
    .values({
      userId: 'user-karel',
      name: 'Byty 2+kk Brno do 6 mil.',
      filters: {
        transaction: 'prodej',
        categoryMain: 'byty',
        disposition: ['2+kk'],
        municipality: 'brno',
        priceMax: 6_000_000,
      },
      frequency: 'denne',
      unsubscribeToken: uuidv7(),
    })
    .onConflictDoNothing()
}

/** Demo data pro vývoj — uživatelé (heslo Heslo123!), RK, inzeráty, oblíbené. */
export async function seedDemoData(db: Database): Promise<void> {
  await seedUsers(db)
  const agencyIdBySlug = await seedAgencies(db)
  const agencyIds = [...agencyIdBySlug.values()]
  await seedListings(db, agencyIds)
  await seedEngagement(db)
}
