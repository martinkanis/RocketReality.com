import { LISTING_WITHDRAWAL_LOCK_DAYS, PUBLIC_ARCHIVE_REASONS } from '@rocket/shared'
import type { ArchiveReason } from '@rocket/shared'

/**
 * Zámek stažení inzerátu. Kdo za zveřejnění dostal odměnu, nesmí inzerát
 * hned stáhnout z webu — po dobu zámku je jediný východ poctivé označení
 * výsledku (prodáno/pronajato), které inzerát ponechá veřejně viditelný.
 */

const DAY_MS = 24 * 3600 * 1000

/** Do kdy zámek běží; null u nezveřejněného inzerátu (není co zamykat). */
export function withdrawalLockedUntil(publishedAt: Date | null): Date | null {
  if (!publishedAt) return null
  return new Date(publishedAt.getTime() + LISTING_WITHDRAWAL_LOCK_DAYS * DAY_MS)
}

export function isPublicArchiveReason(reason: ArchiveReason): boolean {
  return PUBLIC_ARCHIVE_REASONS.some((publicReason) => publicReason === reason)
}

/**
 * Smí inzerent inzerát archivovat s daným důvodem? Prodáno/pronajato vždy;
 * stažení a jiné důvody až po uplynutí zámku.
 */
export function canArchiveWithReason(
  reason: ArchiveReason,
  publishedAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (isPublicArchiveReason(reason)) return true
  const lockedUntil = withdrawalLockedUntil(publishedAt)
  return lockedUntil === null || now.getTime() >= lockedUntil.getTime()
}
