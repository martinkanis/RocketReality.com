import { pino, type Logger } from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

/** Kořenový logger — v dev čitelný výstup přes pino-pretty, v produkci čistý JSON. */
const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

export function createLogger(name: string): Logger {
  return rootLogger.child({ name })
}
