'use server'

import {
  approveListing,
  pauseListing,
  resumeListing,
  softDeleteListing,
  ListingStateError,
} from '@rocket/core'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/require-user'

export type AdminListingActionResult = { ok: true } | { ok: false; error: string }

async function runAdminAction(
  action: (adminId: string) => Promise<void>,
  fallbackError: string,
): Promise<AdminListingActionResult> {
  const admin = await requireSuperadmin()
  try {
    await action(admin.id)
  } catch (error) {
    if (error instanceof ListingStateError) return { ok: false, error: error.message }
    return { ok: false, error: fallbackError }
  }
  revalidatePath('/admin/inzeraty')
  revalidatePath('/admin/moderace')
  return { ok: true }
}

export async function approveListingFromAdminAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  return runAdminAction(
    (adminId) => approveListing(listingId, adminId),
    'Schválení inzerátu selhalo',
  )
}

export async function pauseListingFromAdminAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  return runAdminAction(() => pauseListing(listingId), 'Pozastavení inzerátu selhalo')
}

export async function resumeListingFromAdminAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  return runAdminAction(() => resumeListing(listingId), 'Obnovení inzerátu selhalo')
}

export async function deleteListingFromAdminAction(
  listingId: string,
): Promise<AdminListingActionResult> {
  return runAdminAction(() => softDeleteListing(listingId), 'Smazání inzerátu selhalo')
}
