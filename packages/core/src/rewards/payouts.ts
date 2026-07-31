import { agencies, getDb, listingMedia, listings, rewardPayouts } from '@rocket/db'
import { and, count, countDistinct, eq, isNotNull, isNull, ne } from 'drizzle-orm'
import {
  checkRewardEligibility,
  resolveBeneficiary,
  rewardAmountCzk,
  type RewardBeneficiary,
  type RewardRejectionReason,
} from './eligibility'
import { parseSpayd } from './spayd'

/**
 * Zakládání nároku na odměnu z launch akce.
 *
 * Nárok vzniká **zveřejněním** inzerátu, ne nálezem platebního QR ve fotce —
 * fotky se zpracovávají dřív, než inzerát projde moderací, a za zamítnutý
 * inzerát se neplatí. Volá se proto ze schválení inzerátu i po zpracování
 * fotky (kdy už inzerát zveřejněný být může) a je idempotentní.
 */

export type RewardOutcome =
  | { created: true; amountCzk: number }
  | {
      created: false
      reason: RewardRejectionReason | 'not_published' | 'no_payment_details' | 'already_rewarded'
    }

/** Odmítnuté výplaty se do limitů nepočítají — místo v akci neobsadily. */
const COUNTED_STATUSES_FILTER = ne(rewardPayouts.status, 'rejected')

function beneficiaryFilter(beneficiary: RewardBeneficiary) {
  return beneficiary.kind === 'agency'
    ? eq(rewardPayouts.beneficiaryAgencyId, beneficiary.id)
    : eq(rewardPayouts.beneficiaryUserId, beneficiary.id)
}

async function countRewardedListings(beneficiary: RewardBeneficiary): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(rewardPayouts)
    .where(and(beneficiaryFilter(beneficiary), COUNTED_STATUSES_FILTER))
  return row?.value ?? 0
}

/** Kolik různých příjemců stejného druhu už do akce vstoupilo. */
async function countBeneficiaries(beneficiary: RewardBeneficiary): Promise<number> {
  const column =
    beneficiary.kind === 'agency'
      ? rewardPayouts.beneficiaryAgencyId
      : rewardPayouts.beneficiaryUserId
  const [row] = await getDb()
    .select({ value: countDistinct(column) })
    .from(rewardPayouts)
    .where(and(isNotNull(column), COUNTED_STATUSES_FILTER))
  return row?.value ?? 0
}

/** Platební údaje z QR kódu ve fotkách inzerátu. */
async function findPaymentQr(listingId: string) {
  const [media] = await getDb()
    .select({ id: listingMedia.id, spayd: listingMedia.paymentQrSpayd })
    .from(listingMedia)
    .where(and(eq(listingMedia.listingId, listingId), isNotNull(listingMedia.paymentQrSpayd)))
    .limit(1)
  if (!media?.spayd) return null

  const payment = parseSpayd(media.spayd)
  return payment ? { mediaId: media.id, payment } : null
}

/**
 * Založí nárok na odměnu za zveřejněný inzerát, pokud na něj příjemce má
 * podle podmínek akce nárok. Vrací, co se stalo — volající to jen loguje,
 * chybějící nárok není chyba.
 */
export async function recordRewardForPublishedListing(listingId: string): Promise<RewardOutcome> {
  const db = getDb()
  const [listing] = await db
    .select({
      id: listings.id,
      status: listings.status,
      deletedAt: listings.deletedAt,
      ownerUserId: listings.ownerUserId,
      agencyId: listings.agencyId,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1)

  if (!listing || listing.status !== 'active' || listing.deletedAt) {
    return { created: false, reason: 'not_published' }
  }

  const [existing] = await db
    .select({ id: rewardPayouts.id })
    .from(rewardPayouts)
    .where(eq(rewardPayouts.listingId, listingId))
    .limit(1)
  if (existing) return { created: false, reason: 'already_rewarded' }

  const source = await findPaymentQr(listingId)
  if (!source) return { created: false, reason: 'no_payment_details' }

  const beneficiary = resolveBeneficiary(listing.agencyId, listing.ownerUserId)
  const rewardedListings = await countRewardedListings(beneficiary)
  const eligibility = checkRewardEligibility({
    beneficiary,
    rewardedListings,
    beneficiariesSoFar: await countBeneficiaries(beneficiary),
    isExistingBeneficiary: rewardedListings > 0,
  })
  if (!eligibility.isEligible) return { created: false, reason: eligibility.reason }

  const amountCzk = rewardAmountCzk(beneficiary.kind)
  await db
    .insert(rewardPayouts)
    .values({
      listingId,
      mediaId: source.mediaId,
      beneficiaryUserId: beneficiary.kind === 'private' ? beneficiary.id : null,
      beneficiaryAgencyId: beneficiary.kind === 'agency' ? beneficiary.id : null,
      iban: source.payment.iban,
      bic: source.payment.bic,
      amountCzk,
      spaydRaw: source.payment.raw,
    })
    .onConflictDoNothing()

  return { created: true, amountCzk }
}

/**
 * Přehled čerpání akce pro administraci — kolik má příjemce zveřejněných
 * inzerátů, kolik z nich odměněných a kolik peněz už dostal.
 */
export interface RewardUsageRow {
  agencyId: string
  agencyName: string
  publishedListings: number
  rewardedListings: number
  awaitingCzk: number
  paidCzk: number
}

export async function listAgencyRewardUsage(): Promise<RewardUsageRow[]> {
  const db = getDb()

  const rows = await db
    .select({
      agencyId: agencies.id,
      agencyName: agencies.name,
      publishedListings: countDistinct(listings.id),
    })
    .from(agencies)
    .leftJoin(
      listings,
      and(
        eq(listings.agencyId, agencies.id),
        eq(listings.status, 'active'),
        isNull(listings.deletedAt),
      ),
    )
    .groupBy(agencies.id, agencies.name)

  const payouts = await db
    .select({
      agencyId: rewardPayouts.beneficiaryAgencyId,
      status: rewardPayouts.status,
      amountCzk: rewardPayouts.amountCzk,
    })
    .from(rewardPayouts)
    .where(isNotNull(rewardPayouts.beneficiaryAgencyId))

  return rows
    .map((row) => {
      const own = payouts.filter((payout) => payout.agencyId === row.agencyId)
      const counted = own.filter((payout) => payout.status !== 'rejected')
      return {
        ...row,
        rewardedListings: counted.length,
        paidCzk: own
          .filter((payout) => payout.status === 'paid')
          .reduce((sum, payout) => sum + payout.amountCzk, 0),
        awaitingCzk: counted
          .filter((payout) => payout.status !== 'paid')
          .reduce((sum, payout) => sum + payout.amountCzk, 0),
      }
    })
    .filter((row) => row.publishedListings > 0 || row.rewardedListings > 0)
    .sort(
      (a, b) =>
        b.rewardedListings - a.rewardedListings || b.publishedListings - a.publishedListings,
    )
}
