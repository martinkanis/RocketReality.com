import {
  agencies,
  agencyMembers,
  contactMessages,
  getDb,
  listings,
  moderationCases,
  rewardPayouts,
  users,
} from '@rocket/db'
import { CATEGORIES_MAIN, LISTING_STATUS_LABELS, type ListingStatus } from '@rocket/shared'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'

/** Smazané inzeráty (soft delete) se do statistik nepočítají — výpisy je také skrývají. */
const notDeleted = isNull(listings.deletedAt)

const TREND_DAYS = 30
const RECENT_DAYS = 7

export interface PortalStats {
  activeListings: number
  totalListings: number
  pendingModeration: number
  totalUsers: number
  totalAgencies: number
  pendingRewards: number
  newListingsRecent: number
  newUsersRecent: number
}

export async function getPortalStats(): Promise<PortalStats> {
  const db = getDb()
  const recentSince = daysAgo(RECENT_DAYS)

  const [listingCounts] = await db
    .select({
      active: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'active')::int`,
      total: sql<number>`count(*)::int`,
      recent: sql<number>`count(*) FILTER (WHERE ${listings.createdAt} >= ${recentSince})::int`,
    })
    .from(listings)
    .where(notDeleted)
  const [userCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      recent: sql<number>`count(*) FILTER (WHERE ${users.createdAt} >= ${recentSince})::int`,
    })
    .from(users)
  const [agencyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(agencies)
  const [moderationCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(moderationCases)
    .where(eq(moderationCases.status, 'pending'))
  const [rewardCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewardPayouts)
    .where(eq(rewardPayouts.status, 'detected'))

  return {
    activeListings: listingCounts?.active ?? 0,
    totalListings: listingCounts?.total ?? 0,
    pendingModeration: moderationCount?.count ?? 0,
    totalUsers: userCounts?.total ?? 0,
    totalAgencies: agencyCount?.count ?? 0,
    pendingRewards: rewardCount?.count ?? 0,
    newListingsRecent: listingCounts?.recent ?? 0,
    newUsersRecent: userCounts?.recent ?? 0,
  }
}

export interface DailyCount {
  day: string
  label: string
  value: number
}

/** Denní počty nových řádků za posledních TREND_DAYS dní, včetně nulových dní. */
export async function getDailyTrends(): Promise<{
  newListings: DailyCount[]
  newUsers: DailyCount[]
}> {
  const db = getDb()
  const since = daysAgo(TREND_DAYS - 1)

  const listingRows = await db
    .select({
      day: sql<string>`to_char(${listings.createdAt} AT TIME ZONE 'Europe/Prague', 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(listings)
    .where(and(notDeleted, gte(listings.createdAt, since)))
    .groupBy(sql`1`)
  const userRows = await db
    .select({
      day: sql<string>`to_char(${users.createdAt} AT TIME ZONE 'Europe/Prague', 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(gte(users.createdAt, since))
    .groupBy(sql`1`)

  return {
    newListings: fillDailySeries(listingRows),
    newUsers: fillDailySeries(userRows),
  }
}

export interface BreakdownRow {
  key: string
  label: string
  count: number
}

export async function getListingBreakdowns(): Promise<{
  byStatus: BreakdownRow[]
  byCategory: BreakdownRow[]
}> {
  const db = getDb()
  const statusRows = await db
    .select({ status: listings.status, count: sql<number>`count(*)::int` })
    .from(listings)
    .where(notDeleted)
    .groupBy(listings.status)
    .orderBy(desc(sql`count(*)`))
  const categoryRows = await db
    .select({ categoryMainId: listings.categoryMainId, count: sql<number>`count(*)::int` })
    .from(listings)
    .where(notDeleted)
    .groupBy(listings.categoryMainId)
    .orderBy(desc(sql`count(*)`))

  const categoryNameById = new Map(CATEGORIES_MAIN.map((category) => [category.id, category.name]))

  return {
    byStatus: statusRows.map((row) => ({
      key: row.status,
      label: LISTING_STATUS_LABELS[row.status],
      count: row.count,
    })),
    byCategory: categoryRows.map((row) => ({
      key: String(row.categoryMainId),
      label: categoryNameById.get(row.categoryMainId) ?? `Kategorie ${row.categoryMainId}`,
      count: row.count,
    })),
  }
}

export interface TopListingRow {
  id: string
  slug: string
  title: string
  status: ListingStatus
  viewCount: number
  inquiryCount: number
  ownerName: string
  agencyName: string | null
}

export async function getTopListingsByViews(limit: number): Promise<TopListingRow[]> {
  const db = getDb()
  return db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      viewCount: listings.viewCount,
      inquiryCount: sql<number>`(
        SELECT count(*)::int FROM ${contactMessages}
        WHERE ${contactMessages.listingId} = ${listings.id}
      )`,
      ownerName: users.name,
      agencyName: agencies.name,
    })
    .from(listings)
    .innerJoin(users, eq(listings.ownerUserId, users.id))
    .leftJoin(agencies, eq(listings.agencyId, agencies.id))
    .where(notDeleted)
    .orderBy(desc(listings.viewCount))
    .limit(limit)
}

export interface AgencyStats {
  memberCount: number
  activeListings: number
  totalListings: number
  totalViews: number
  totalInquiries: number
}

export async function getAgencyStats(agencyId: string): Promise<AgencyStats> {
  const db = getDb()
  const [memberRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyMembers)
    .where(eq(agencyMembers.agencyId, agencyId))
  const [listingRow] = await db
    .select({
      active: sql<number>`count(*) FILTER (WHERE ${listings.status} = 'active')::int`,
      total: sql<number>`count(*)::int`,
      views: sql<number>`coalesce(sum(${listings.viewCount}), 0)::int`,
    })
    .from(listings)
    .where(and(notDeleted, eq(listings.agencyId, agencyId)))
  const [inquiryRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .innerJoin(listings, eq(contactMessages.listingId, listings.id))
    .where(and(notDeleted, eq(listings.agencyId, agencyId)))

  return {
    memberCount: memberRow?.count ?? 0,
    activeListings: listingRow?.active ?? 0,
    totalListings: listingRow?.total ?? 0,
    totalViews: listingRow?.views ?? 0,
    totalInquiries: inquiryRow?.count ?? 0,
  }
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function fillDailySeries(rows: { day: string; count: number }[]): DailyCount[] {
  const countByDay = new Map(rows.map((row) => [row.day, row.count]))
  const series: DailyCount[] = []
  for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = daysAgo(offset)
    // Klíč musí odpovídat to_char(... AT TIME ZONE 'Europe/Prague') v SQL.
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
