import { pino, type Logger } from 'pino'
import { loadEnv } from '@rocket/config'

let rootLogger: Logger | null = null

function getRootLogger(): Logger {
  if (rootLogger) return rootLogger
  const isDevelopment = loadEnv().NODE_ENV === 'development'
  rootLogger = pino({
    level: isDevelopment ? 'debug' : 'info',
    transport: isDevelopment ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  })
  return rootLogger
}

/** Vytvoří pojmenovaný child logger — jeden na modul či job. */
export function createLogger(name: string): Logger {
  return getRootLogger().child({ name })
}
