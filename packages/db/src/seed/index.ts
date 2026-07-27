import { closeDb, getDb } from '../client'
import { seedCatalogs } from './catalogs'
import { seedDemoData } from './demo'

async function main() {
  const db = getDb()
  await seedCatalogs(db)
  process.stdout.write('Číselníky naseedovány.\n')
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoData(db)
    process.stdout.write('Demo data naseedována.\n')
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed selhal: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    )
    process.exitCode = 1
  })
  .finally(() => closeDb())
