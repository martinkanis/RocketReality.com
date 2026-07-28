import { getDb, listings, pageViews } from '@rocket/db'
import { and, desc, eq, gte, isNull, sql, type SQL } from 'drizzle-orm'

const TREND_DAYS = 30

export interface ViewSummary {
  totalViews: number
  recentViews: number
  averageDurationSeconds: number | null
}

export interface ListingViewRow {
  listingId: string
  slug: string
  title: string
  views: number
  averageDurationSeconds: number | null
}

export interface DailyViews {
  day: string
  label: string
  value: number
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

/** Souhrn návštěv inzerátů uživatele (jeho vlastní inzeráty, bez smazaných). */
export async function getListingViewSummary(userId: string): Promise<ViewSummary> {
  return getViewSummary(and(eq(listings.ownerUserId, userId), isNull(listings.deletedAt))!)
}

/** Souhrn návštěv inzerátů celé realitní kanceláře. */
export async function getAgencyListingViewSummary(agencyId: string): Promise<ViewSummary> {
  return getViewSummary(and(eq(listings.agencyId, agencyId), isNull(listings.deletedAt))!)
}

async function getViewSummary(listingFilter: SQL): Promise<ViewSummary> {
  const db = getDb()
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      recent: sql<number>`count(*) FILTER (WHERE ${pageViews.createdAt} >= ${daysAgo(TREND_DAYS - 1)})::int`,
      avgDuration: sql<number | null>`avg(${pageViews.durationSeconds})`,
    })
    .from(pageViews)
    .innerJoin(listings, eq(pageViews.listingId, listings.id))
    .where(listingFilter)

  return {
    totalViews: row?.total ?? 0,
    recentViews: row?.recent ?? 0,
    averageDurationSeconds: row?.avgDuration != null ? Math.round(Number(row.avgDuration)) : null,
  }
}

/** Souhrn návštěv veřejného profilu kanceláře. */
export async function getAgencyProfileViewSummary(agencyId: string): Promise<ViewSummary> {
  const db = getDb()
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      recent: sql<number>`count(*) FILTER (WHERE ${pageViews.createdAt} >= ${daysAgo(TREND_DAYS - 1)})::int`,
      avgDuration: sql<number | null>`avg(${pageViews.durationSeconds})`,
    })
    .from(pageViews)
    .where(eq(pageViews.agencyId, agencyId))

  return {
    totalViews: row?.total ?? 0,
    recentViews: row?.recent ?? 0,
    averageDurationSeconds: row?.avgDuration != null ? Math.round(Number(row.avgDuration)) : null,
  }
}

/** Nejnavštěvovanější inzeráty s průměrnou dobou na stránce. */
export async function getTopListingViews(
  listingFilter: SQL,
  limit: number,
): Promise<ListingViewRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      listingId: listings.id,
      slug: listings.slug,
      title: listings.title,
      views: sql<number>`count(${pageViews.id})::int`,
      avgDuration: sql<number | null>`avg(${pageViews.durationSeconds})`,
    })
    .from(listings)
    .leftJoin(pageViews, eq(pageViews.listingId, listings.id))
    .where(listingFilter)
    .groupBy(listings.id)
    .orderBy(desc(sql`count(${pageViews.id})`))
    .limit(limit)

  return rows.map((row) => ({
    listingId: row.listingId,
    slug: row.slug,
    title: row.title,
    views: row.views,
    averageDurationSeconds: row.avgDuration != null ? Math.round(Number(row.avgDuration)) : null,
  }))
}

/** Denní počty návštěv za posledních 30 dní, včetně dní bez návštěv. */
export async function getDailyViews(entityFilter: SQL, joinListings: boolean): Promise<DailyViews[]> {
  const db = getDb()
  const since = daysAgo(TREND_DAYS - 1)
  const selection = {
    day: sql<string>`to_char(${pageViews.createdAt} AT TIME ZONE 'Europe/Prague', 'YYYY-MM-DD')`,
    count: sql<number>`count(*)::int`,
  }

  const rows = joinListings
    ? await db
        .select(selection)
        .from(pageViews)
        .innerJoin(listings, eq(pageViews.listingId, listings.id))
        .where(and(entityFilter, gte(pageViews.createdAt, since)))
        .groupBy(sql`1`)
    : await db
        .select(selection)
        .from(pageViews)
        .where(and(entityFilter, gte(pageViews.createdAt, since)))
        .groupBy(sql`1`)

  const countByDay = new Map(rows.map((row) => [row.day, row.count]))
  const series: DailyViews[] = []
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = daysAgo(offset)
    const key = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' })
    series.push({
      day: key,
      label: date.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'Europe/Prague',
      }),
      value: countByDay.get(key) ?? 0,
    })
  }
  return series
}

/** Formátuje průměrnou dobu na stránce do čitelné podoby („2 min 15 s"). */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}
