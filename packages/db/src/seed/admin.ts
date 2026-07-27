import { loadEnv } from '@rocket/config'
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Database } from '../client'
import { accounts, users } from '../schema'

/**
 * Založí admin účet podle ADMIN_EMAIL/ADMIN_PASSWORD — bootstrap pro
 * prostředí bez přímého přístupu do DB (Rock8Cloud). Bez obou proměnných
 * nedělá nic. Existujícímu účtu jen zajistí roli admin; heslo mu nemění,
 * aby env nepřepisovala heslo později změněné v aplikaci.
 */
export async function seedAdminAccount(db: Database): Promise<void> {
  const env = loadEnv()
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, env.ADMIN_EMAIL))
    .limit(1)

  if (existing) {
    if (existing.role !== 'admin') {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing.id))
      process.stdout.write(`Účet ${env.ADMIN_EMAIL} povýšen na admina.\n`)
    }
    return
  }

  const userId = uuidv7()
  await db.insert(users).values({
    id: userId,
    email: env.ADMIN_EMAIL,
    name: 'Admin',
    emailVerified: true,
    role: 'admin',
    accountType: 'soukromnik',
  })
  await db.insert(accounts).values({
    id: `${userId}-credential`,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: await hashPassword(env.ADMIN_PASSWORD),
  })
  process.stdout.write(`Admin účet ${env.ADMIN_EMAIL} založen.\n`)
}
