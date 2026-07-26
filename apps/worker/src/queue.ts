import PgBoss from 'pg-boss'
import { loadEnv } from '@rocket/config'
import { registerJob, type JobDefinition } from './jobs/define-job'
import { createLogger } from './logger'

const logger = createLogger('queue')

/**
 * Port nad frontou úloh — zbytek workeru závisí jen na tomto rozhraní,
 * implementaci (pg-boss) lze vyměnit např. za BullMQ bez zásahu do jobů.
 */
export interface JobQueue {
  enqueue<T extends object>(name: string, payload: T): Promise<void>
  schedule(name: string, cron: string): Promise<void>
  register<T extends object>(job: JobDefinition<T>): Promise<void>
  stop(): Promise<void>
}

export async function createQueue(): Promise<JobQueue> {
  const boss = new PgBoss({
    connectionString: loadEnv().DATABASE_URL,
    schema: 'pgboss',
  })
  boss.on('error', (error) => {
    logger.error({ err: error }, 'Chyba fronty pg-boss')
  })
  await boss.start()

  return {
    async enqueue(name, payload) {
      await boss.send(name, payload)
    },
    async schedule(name, cron) {
      await boss.schedule(name, cron)
    },
    async register(job) {
      await registerJob(boss, job)
    },
    async stop() {
      await boss.stop()
    },
  }
}
