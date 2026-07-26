import { loadEnv } from '@rocket/config'
import { accounts, getDb, sessions, users, verifications } from '@rocket/db'
import { sendPasswordResetEmail, sendVerificationEmail } from '@rocket/emails'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'

const env = loadEnv()

const portalRoles = {
  user: userAc,
  superadmin: adminAc,
}

/**
 * Serverová better-auth instance. Role portálu: user / superadmin (admin plugin),
 * příslušnost k RK řeší doménová tabulka agency_members.
 */
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, userName: user.name, resetUrl: url })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, userName: user.name, verifyUrl: url })
    },
  },
  user: {
    modelName: 'users',
    additionalFields: {
      phone: { type: 'string', required: false },
      accountType: { type: 'string', required: false, defaultValue: 'soukromnik' },
    },
  },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
  plugins: [admin({ roles: portalRoles, adminRoles: ['superadmin'] })],
})

export type AuthSession = typeof auth.$Infer.Session
