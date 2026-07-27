'use server'

import { createHash, randomBytes } from 'node:crypto'
import { getDb, importFeeds } from '@rocket/db'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/require-user'
import { getAgencyMembership } from '@/lib/session'

const API_KEY_PREFIX = 'rrk_'
const API_KEY_RANDOM_BYTES = 24
const MAX_ACTIVE_KEYS = 5

const labelSchema = z.string().trim().min(1, 'Zadejte název klíče').max(100)

export interface CreateApiKeyResult {
  ok: boolean
  apiKey?: string
  error?: string
}

/**
 * Vytvoří API klíč pro import inzerátů. Plaintext klíč se vrací jedinkrát —
 * v databázi zůstává jen SHA-256 hash.
 */
export async function createApiKey(label: string): Promise<CreateApiKeyResult> {
  const user = await requireUser()
  const parsedLabel = labelSchema.safeParse(label)
  if (!parsedLabel.success) {
    return { ok: false, error: parsedLabel.error.issues[0]?.message ?? 'Nevalidní název' }
  }

  const db = getDb()
  const activeKeys = await db
    .select({ id: importFeeds.id })
    .from(importFeeds)
    .where(and(eq(importFeeds.createdByUserId, user.id), eq(importFeeds.isActive, true)))
  if (activeKeys.length >= MAX_ACTIVE_KEYS) {
    return { ok: false, error: `Můžete mít nejvýše ${MAX_ACTIVE_KEYS} aktivních klíčů` }
  }

  const apiKey = `${API_KEY_PREFIX}${randomBytes(API_KEY_RANDOM_BYTES).toString('hex')}`
  const membership = await getAgencyMembership(user.id)
  await db.insert(importFeeds).values({
    createdByUserId: user.id,
    agencyId: membership?.agencyId ?? null,
    label: parsedLabel.data,
    type: 'api_push',
    apiKeyHash: createHash('sha256').update(apiKey).digest('hex'),
  })

  revalidatePath('/muj-ucet/api-klice')
  return { ok: true, apiKey }
}

/** Deaktivuje klíč — importy s ním okamžitě přestanou procházet. */
export async function deactivateApiKey(feedId: string): Promise<void> {
  const user = await requireUser()
  const db = getDb()
  await db
    .update(importFeeds)
    .set({ isActive: false })
    .where(and(eq(importFeeds.id, feedId), eq(importFeeds.createdByUserId, user.id)))
  revalidatePath('/muj-ucet/api-klice')
}
