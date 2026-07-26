import { auth } from '@rocket/auth'
import { agencyMembers, getDb } from '@rocket/db'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { cache } from 'react'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  accountType: string
  isSuperadmin: boolean
}

/** Přihlášený uživatel pro server components a actions (per-request cache). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const { user } = session
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role ?? 'user',
    accountType: (user as { accountType?: string }).accountType ?? 'soukromnik',
    isSuperadmin: user.role === 'superadmin',
  }
})

export interface AgencyMembership {
  agencyId: string
  role: string
}

/** Aktivní členství uživatele v realitní kanceláři (první nalezené). */
export const getAgencyMembership = cache(
  async (userId: string): Promise<AgencyMembership | null> => {
    const db = getDb()
    const [membership] = await db
      .select({ agencyId: agencyMembers.agencyId, role: agencyMembers.role })
      .from(agencyMembers)
      .where(eq(agencyMembers.userId, userId))
      .limit(1)
    return membership ?? null
  },
)
