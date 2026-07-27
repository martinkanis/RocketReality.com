'use server'

import { approveListing, rejectListing } from '@rocket/core'
import { MODERATION_REASONS, type ModerationReason } from '@rocket/shared'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/require-user'

export async function approveListingAction(listingId: string): Promise<void> {
  const admin = await requireSuperadmin()
  await approveListing(listingId, admin.id)
  revalidatePath('/admin/moderace')
}

export async function rejectListingAction(
  listingId: string,
  reasonCode: string,
  note: string,
): Promise<void> {
  const admin = await requireSuperadmin()
  if (!MODERATION_REASONS.includes(reasonCode as ModerationReason)) {
    throw new Error(`Neznámý důvod zamítnutí: ${reasonCode}`)
  }
  if (!note.trim()) {
    throw new Error('Důvod zamítnutí pro inzerenta je povinný')
  }
  await rejectListing(listingId, admin.id, reasonCode as ModerationReason, note.trim())
  revalidatePath('/admin/moderace')
}
