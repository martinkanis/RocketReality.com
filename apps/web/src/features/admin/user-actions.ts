'use server'

import { randomBytes } from 'node:crypto'
import { auth } from '@rocket/auth'
import { getDb, listings } from '@rocket/db'
import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireSuperadmin } from '@/lib/require-user'

export type UserActionResult = { ok: true } | { ok: false; error: string }
export type ResetPasswordResult = { ok: true; password: string } | { ok: false; error: string }

const GENERATED_PASSWORD_BYTES = 12

/** Guard proti zamknutí vlastního účtu — admin nesmí měnit sám sebe. */
async function requireOtherUser(userId: string): Promise<{ ok: false; error: string } | null> {
  const admin = await requireSuperadmin()
  if (admin.id === userId) {
    return { ok: false, error: 'Vlastní účet nelze upravovat z administrace' }
  }
  return null
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function setUserRoleAction(
  userId: string,
  role: 'user' | 'admin',
): Promise<UserActionResult> {
  const selfGuard = await requireOtherUser(userId)
  if (selfGuard) return selfGuard
  try {
    await auth.api.setRole({ body: { userId, role }, headers: await headers() })
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Změna role selhala') }
  }
  revalidatePath('/admin/uzivatele')
  return { ok: true }
}

export async function banUserAction(userId: string, reason: string): Promise<UserActionResult> {
  const selfGuard = await requireOtherUser(userId)
  if (selfGuard) return selfGuard
  try {
    await auth.api.banUser({
      body: { userId, banReason: reason.trim() || undefined },
      headers: await headers(),
    })
    await auth.api.revokeUserSessions({ body: { userId }, headers: await headers() })
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Zablokování selhalo') }
  }
  revalidatePath('/admin/uzivatele')
  return { ok: true }
}

export async function unbanUserAction(userId: string): Promise<UserActionResult> {
  const selfGuard = await requireOtherUser(userId)
  if (selfGuard) return selfGuard
  try {
    await auth.api.unbanUser({ body: { userId }, headers: await headers() })
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Odblokování selhalo') }
  }
  revalidatePath('/admin/uzivatele')
  return { ok: true }
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const selfGuard = await requireOtherUser(userId)
  if (selfGuard) return selfGuard

  const db = getDb()
  const [owned] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(eq(listings.ownerUserId, userId))
  if ((owned?.count ?? 0) > 0) {
    return {
      ok: false,
      error: `Uživatel má ${owned?.count} inzerátů — účet nelze smazat, zvažte zablokování`,
    }
  }

  try {
    await auth.api.removeUser({ body: { userId }, headers: await headers() })
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Smazání účtu selhalo') }
  }
  revalidatePath('/admin/uzivatele')
  return { ok: true }
}

/** Vygeneruje nové heslo, nastaví ho uživateli a odhlásí ho ze všech zařízení. */
export async function resetUserPasswordAction(userId: string): Promise<ResetPasswordResult> {
  const selfGuard = await requireOtherUser(userId)
  if (selfGuard) return selfGuard

  const newPassword = randomBytes(GENERATED_PASSWORD_BYTES).toString('base64url')
  try {
    await auth.api.setUserPassword({ body: { userId, newPassword }, headers: await headers() })
    await auth.api.revokeUserSessions({ body: { userId }, headers: await headers() })
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Reset hesla selhal') }
  }
  revalidatePath('/admin/uzivatele')
  return { ok: true, password: newPassword }
}
