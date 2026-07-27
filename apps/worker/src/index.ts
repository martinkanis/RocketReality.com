import { createServer } from 'node:http'
import { loadEnv } from '@rocket/config'
import { closeDb } from '@rocket/db'
import { EXPIRE_LISTINGS_CRON, expireListingsJob } from './jobs/expire-listings'
import { IMPORT_MEDIA_SWEEP_CRON, importMediaSweepJob } from './jobs/import-media-sweep'
import { MEDIA_SWEEP_CRON, mediaSweepJob } from './jobs/media-sweep'
import { processPhotoJob } from './jobs/process-photo'
import { sendEmailJob } from './jobs/send-email'
import { WATCHDOG_CRON, watchdogJob } from './jobs/watchdog'
import { createLogger } from './logger'
import { createQueue, type JobQueue } from './queue'

const HEALTHCHECK_PORT = 3010

const logger = createLogger('worker')

function createHealthcheckServer() {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('ok')
      return
    }
    response.writeHead(404)
    response.end()
  })
}

function setupGracefulShutdown(queue: JobQueue, server: ReturnType<typeof createServer>): void {
  let isShuttingDown = false

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return
    isShuttingDown = true
    logger.info({ signal }, 'Ukončuji worker')

    void (async () => {
      try {
        await queue.stop()
        await closeDb()
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        })
        logger.info('Worker ukončen')
        process.exit(0)
      } catch (error) {
        logger.error({ err: error }, 'Graceful shutdown selhal')
        process.exit(1)
      }
    })()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

async function main(): Promise<void> {
  loadEnv()

  const queue = await createQueue()

  await queue.register(sendEmailJob)
  await queue.register(expireListingsJob)
  await queue.register(watchdogJob)
  await queue.register(processPhotoJob)
  await queue.register(mediaSweepJob)
  await queue.register(importMediaSweepJob)

  await queue.schedule(expireListingsJob.name, EXPIRE_LISTINGS_CRON)
  await queue.schedule(watchdogJob.name, WATCHDOG_CRON)
  await queue.schedule(mediaSweepJob.name, MEDIA_SWEEP_CRON)
  await queue.schedule(importMediaSweepJob.name, IMPORT_MEDIA_SWEEP_CRON)

  const server = createHealthcheckServer()
  server.listen(HEALTHCHECK_PORT, () => {
    logger.info({ port: HEALTHCHECK_PORT }, 'Healthcheck server běží')
  })

  setupGracefulShutdown(queue, server)

  logger.info('Worker nastartován — joby zaregistrované, crony naplánované')
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'Start workeru selhal')
  process.exit(1)
})
