'use server'

import { getDb, rewardPayouts } from '@rocket/db'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/require-user'

async function transitionReward(
  id: string,
  from: 'detected' | 'approved',
  to: 'approved' | 'paid' | 'rejected',
  extra: Partial<typeof rewardPayouts.$inferInsert> = {},
): Promise<void> {
  const db = getDb()
  const updated = await db
    .update(rewardPayouts)
    .set({ status: to, ...extra })
    .where(and(eq(rewardPayouts.id, id), eq(rewardPayouts.status, from)))
    .returning({ id: rewardPayouts.id })
  if (updated.length === 0) {
    throw new Error(`Odměna není ve stavu '${from}' — obnovte stránku`)
  }
  revalidatePath('/admin/odmeny')
}

/** Admin potvrdil, že fotky jsou v pořádku a QR platba je legitimní. */
export async function approveRewardAction(id: string): Promise<void> {
  const admin = await requireSuperadmin()
  await transitionReward(id, 'detected', 'approved', {
    approvedByUserId: admin.id,
    approvedAt: new Date(),
  })
}

export async function rejectRewardAction(id: string, note: string): Promise<void> {
  await requireSuperadmin()
  await transitionReward(id, 'detected', 'rejected', { note: note.trim() || null })
}

/** Admin zaplatil QR svou bankovní aplikací a označuje odměnu za vyplacenou. */
export async function markRewardPaidAction(id: string): Promise<void> {
  await requireSuperadmin()
  await transitionReward(id, 'approved', 'paid', { paidAt: new Date() })
}
