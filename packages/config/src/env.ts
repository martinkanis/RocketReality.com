import { z } from 'zod'

/**
 * Serverové proměnné prostředí — validované na startu procesu (web i worker).
 * Chybějící/nevalidní hodnota = okamžitý pád s čitelnou chybou, ne tichý undefined.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  APP_URL: z.url().default('http://localhost:3000'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('RocketReality <info@rocketreality.cz>'),

  S3_ENDPOINT: z.url().default('http://localhost:9100'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('rocketreality'),
  S3_ACCESS_KEY_ID: z.string().default('rocket'),
  S3_SECRET_ACCESS_KEY: z.string().default('rocketreality'),
  S3_PUBLIC_URL: z.url().default('http://localhost:9100/rocketreality'),

  AUTH_SECRET: z.string().min(16).default('dev-secret-change-me-in-production'),

  PAYMENTS_PROVIDER: z.enum(['free', 'stripe']).default('free'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Nevalidní konfigurace prostředí:\n${issues}`)
  }
  cachedEnv = parsed.data
  return cachedEnv
}
