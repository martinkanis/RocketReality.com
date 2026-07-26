import type PgBoss from 'pg-boss'
import { createLogger } from '../logger'

export interface JobDefinition<T extends object = Record<string, never>> {
  name: string
  handler: (data: T) => Promise<void>
}

/** Typovaná definice jobu — samotnou registraci do fronty provádí registerJob. */
export function defineJob<T extends object = Record<string, never>>(
  definition: JobDefinition<T>,
): JobDefinition<T> {
  return definition
}

/**
 * Zaregistruje job do pg-boss. Pg-boss v10 vyžaduje explicitní createQueue
 * před work/send — bez něj by registrace workeru selhala.
 */
export async function registerJob<T extends object>(
  boss: PgBoss,
  { name, handler }: JobDefinition<T>,
): Promise<void> {
  const logger = createLogger(name)
  await boss.createQueue(name)
  // Pg-boss v10 předává handleru dávku jobů (výchozí batchSize = 1)
  await boss.work<T>(name, async (jobs) => {
    for (const job of jobs) {
      const startedAt = Date.now()
      try {
        await handler(job.data)
        logger.info({ jobId: job.id, durationMs: Date.now() - startedAt }, 'Job dokončen')
      } catch (error) {
        logger.error(
          { jobId: job.id, durationMs: Date.now() - startedAt, err: error },
          'Job selhal',
        )
        throw error
      }
    }
  })
}
