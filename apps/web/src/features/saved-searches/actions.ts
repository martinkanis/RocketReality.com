'use server'

import { searchQuerySchema } from '@rocket/core'
import { getDb, savedSearches } from '@rocket/db'
import { SAVED_SEARCH_FREQUENCIES, type SavedSearchFrequency } from '@rocket/shared'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/require-user'

function assertValidFrequency(frequency: SavedSearchFrequency): void {
  if (!SAVED_SEARCH_FREQUENCIES.includes(frequency)) {
    throw new Error(`Neznámá frekvence hlídacího psa: ${String(frequency)}`)
  }
}

/** Založí hlídacího psa nad aktuálními filtry hledání. */
export async function createSavedSearch(
  name: string,
  filters: unknown,
  frequency: SavedSearchFrequency = 'denne',
): Promise<void> {
  const user = await requireUser()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Název hlídacího psa je povinný')
  }
  assertValidFrequency(frequency)
  const parsedFilters = searchQuerySchema.safeParse(filters)
  if (!parsedFilters.success) {
    throw new Error('Filtry hledání mají neplatný tvar — hlídacího psa nelze uložit')
  }
  await getDb().insert(savedSearches).values({
    userId: user.id,
    name: trimmedName,
    filters: parsedFilters.data,
    frequency,
    unsubscribeToken: crypto.randomUUID(),
  })
  revalidatePath('/muj-ucet/hlidaci-pes')
}

export interface UpdateSavedSearchData {
  name?: string
  frequency?: SavedSearchFrequency
  isActive?: boolean
}

/** Upraví název, frekvenci nebo aktivitu hlídacího psa — jen vlastníkovi. */
export async function updateSavedSearch(id: string, data: UpdateSavedSearchData): Promise<void> {
  const user = await requireUser()
  const changes: UpdateSavedSearchData = {}
  if (data.name !== undefined) {
    const trimmedName = data.name.trim()
    if (!trimmedName) {
      throw new Error('Název hlídacího psa nesmí být prázdný')
    }
    changes.name = trimmedName
  }
  if (data.frequency !== undefined) {
    assertValidFrequency(data.frequency)
    changes.frequency = data.frequency
  }
  if (data.isActive !== undefined) {
    changes.isActive = data.isActive
  }
  if (Object.keys(changes).length === 0) return

  const updated = await getDb()
    .update(savedSearches)
    .set(changes)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
    .returning({ id: savedSearches.id })
  if (updated.length === 0) {
    throw new Error('Uložené hledání neexistuje nebo nepatří přihlášenému uživateli')
  }
  revalidatePath('/muj-ucet/hlidaci-pes')
}

/** Smaže hlídacího psa — jen vlastníkovi. */
export async function deleteSavedSearch(id: string): Promise<void> {
  const user = await requireUser()
  const deleted = await getDb()
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
    .returning({ id: savedSearches.id })
  if (deleted.length === 0) {
    throw new Error('Uložené hledání neexistuje nebo nepatří přihlášenému uživateli')
  }
  revalidatePath('/muj-ucet/hlidaci-pes')
}
