'use server'

import { createHash, randomBytes } from 'node:crypto'
import { createImportPassword, hashImportPassword } from '@rocket/core'
import { getDb, importFeeds } from '@rocket/db'
import { and, desc, eq } from 'drizzle-orm'
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

export interface CreateRpcAccessResult {
  ok: boolean
  access?: { clientId: number; password: string }
  error?: string
}

const softwareKeySchema = z.string().trim().min(1, 'Zadejte klíč exportního softwaru').max(200)

/** Nejnižší číslo klienta — nižší hodnoty si necháváme volné pro ruční zavedení. */
const FIRST_CLIENT_ID = 100_000

async function nextClientId(): Promise<number> {
  const [highest] = await getDb()
    .select({ clientId: importFeeds.clientId })
    .from(importFeeds)
    .orderBy(desc(importFeeds.clientId))
    .limit(1)
  return Math.max(FIRST_CLIENT_ID, (highest?.clientId ?? 0) + 1)
}

/**
 * Zřídí přístup pro exportní software realitní kanceláře (XML-RPC na /RPC2).
 * Heslo se generuje náhodně a zobrazí jedinkrát — v databázi zůstává jen jeho
 * MD5, protože s ním pracuje výpočet session_id předepsaný protokolem.
 * Klíč softwaru zadává kancelář podle toho, co má nastavené ve svém exportu;
 * bez shody by výpočet session_id nesouhlasil.
 */
export async function createImportRpcAccess(
  label: string,
  softwareKey: string,
): Promise<CreateRpcAccessResult> {
  const user = await requireUser()
  const parsedLabel = labelSchema.safeParse(label)
  if (!parsedLabel.success) {
    return { ok: false, error: parsedLabel.error.issues[0]?.message ?? 'Nevalidní název' }
  }
  const parsedSoftwareKey = softwareKeySchema.safeParse(softwareKey)
  if (!parsedSoftwareKey.success) {
    return { ok: false, error: parsedSoftwareKey.error.issues[0]?.message ?? 'Nevalidní klíč' }
  }

  const db = getDb()
  const activeKeys = await db
    .select({ id: importFeeds.id })
    .from(importFeeds)
    .where(and(eq(importFeeds.createdByUserId, user.id), eq(importFeeds.isActive, true)))
  if (activeKeys.length >= MAX_ACTIVE_KEYS) {
    return { ok: false, error: `Můžete mít nejvýše ${MAX_ACTIVE_KEYS} aktivních přístupů` }
  }

  const password = createImportPassword()
  const clientId = await nextClientId()
  const membership = await getAgencyMembership(user.id)
  await db.insert(importFeeds).values({
    createdByUserId: user.id,
    agencyId: membership?.agencyId ?? null,
    label: parsedLabel.data,
    type: 'xml_rpc',
    clientId,
    importPasswordMd5: hashImportPassword(password),
    softwareKey: parsedSoftwareKey.data,
  })

  revalidatePath('/muj-ucet/api-klice')
  return { ok: true, access: { clientId, password } }
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
