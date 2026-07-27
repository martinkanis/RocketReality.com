import { createHash } from 'node:crypto'
import {
  ImportValidationError,
  importListing,
  importListingSchema,
  type ImportFeedIdentity,
} from '@rocket/core'
import { getDb, importFeeds } from '@rocket/db'
import { and, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('api.import')

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

async function authenticateFeed(request: NextRequest): Promise<ImportFeedIdentity | null> {
  const authorization = request.headers.get('authorization') ?? ''
  const apiKey = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!apiKey) return null

  const db = getDb()
  const [feed] = await db
    .select({
      id: importFeeds.id,
      agencyId: importFeeds.agencyId,
      createdByUserId: importFeeds.createdByUserId,
    })
    .from(importFeeds)
    .where(and(eq(importFeeds.apiKeyHash, hashApiKey(apiKey)), eq(importFeeds.isActive, true)))
    .limit(1)

  if (!feed?.createdByUserId) return null
  return { id: feed.id, agencyId: feed.agencyId, createdByUserId: feed.createdByUserId }
}

/** Import inzerátu realitním softwarem — kontrakt viz /api-dokumentace. */
export async function POST(request: NextRequest) {
  const feed = await authenticateFeed(request)
  if (!feed) {
    return NextResponse.json({ error: 'Chybějící nebo neplatný API klíč' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Tělo požadavku není validní JSON' }, { status: 422 })
  }

  const parsed = importListingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Tělo požadavku neprošlo validací',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 422 },
    )
  }

  try {
    const result = await importListing(feed, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    logger.error({ err: error, feedId: feed.id }, 'Import inzerátu selhal')
    return NextResponse.json({ error: 'Import se nepodařilo zpracovat' }, { status: 500 })
  }
}
