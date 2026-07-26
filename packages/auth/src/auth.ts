import { loadEnv } from '@rocket/config'
import { accounts, getDb, sessions, users, verifications } from '@rocket/db'
import { sendPasswordResetEmail, sendVerificationEmail } from '@rocket/emails'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'

const env = loadEnv()

/**
 * Serverová better-auth instance. Role portálu: user / admin (admin plugin,
 * role 'admin' = superadmin portálu), příslušnost k RK řeší tabulka agency_members.
 */
export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: { users, sessions, accounts, verifications },
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
  plugins: [admin()],
})

export type AuthSession = typeof auth.$Infer.Session
