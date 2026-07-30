import { getDb, importFeeds, importSessions, listings } from '@rocket/db'
import { and, eq, isNull } from 'drizzle-orm'
import { importListing, ImportValidationError, type ImportFeedIdentity } from '../service'
import { AdvertMappingError, mapAdvertToImportInput, type SrealityAdvert } from './advert-mapping'
import {
  SESSION_IDLE_TIMEOUT_MS,
  createSessionId,
  getFixedPart,
  matchesExpectedSessionId,
} from './session'
import type { XmlRpcMethodCall, XmlRpcValue } from './xml-rpc'

/** Návratové kódy importního rozhraní — významy odpovídají HTTP konvenci (2xx = OK). */
const STATUS = {
  ok: 200,
  unknownClient: 402,
  badSession: 407,
  incompleteData: 452,
} as const

const INTERFACE_VERSION = '3.0.0'

/** Chyba nesoucí návratový kód rozhraní; dispatcher ji převede na odpověď. */
class RpcStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Odpověď rozhraní. Záměrně type alias, ne interface — jen tak je typ
 * přiřaditelný do XmlRpcValue při serializaci.
 */
export type RpcResponse = {
  status: number
  statusMessage: string
  output: XmlRpcValue
}

function ok(output: XmlRpcValue = {}): RpcResponse {
  return { status: STATUS.ok, statusMessage: 'OK', output }
}

function requireString(params: XmlRpcValue[], index: number, name: string): string {
  const value = params[index]
  if (typeof value !== 'string' || !value) {
    throw new RpcStatusError(STATUS.badSession, `Chybí parametr ${name}`)
  }
  return value
}

function requireStruct(params: XmlRpcValue[], index: number, name: string): SrealityAdvert {
  const value = params[index]
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    value instanceof Date
  ) {
    throw new RpcStatusError(STATUS.incompleteData, `Chybí struktura ${name}`)
  }
  return value as SrealityAdvert
}

interface ResolvedSession {
  sessionRowId: string
  feed: ImportFeedIdentity
}

/**
 * Ověří session_id, posune relaci na novou hodnotu a prodlouží platnost.
 * Protokol mění session_id s každým autorizovaným požadavkem, takže platí
 * vždy jen hodnota odvozená z té poslední.
 */
async function resolveSession(
  sessionId: string,
  requireLoggedIn: boolean,
): Promise<ResolvedSession> {
  const db = getDb()
  const [row] = await db
    .select({
      sessionRowId: importSessions.id,
      storedSessionId: importSessions.sessionId,
      isAuthorized: importSessions.isAuthorized,
      expiresAt: importSessions.expiresAt,
      feedId: importFeeds.id,
      agencyId: importFeeds.agencyId,
      createdByUserId: importFeeds.createdByUserId,
      isActive: importFeeds.isActive,
      passwordMd5: importFeeds.importPasswordMd5,
      softwareKey: importFeeds.softwareKey,
    })
    .from(importSessions)
    .innerJoin(importFeeds, eq(importSessions.feedId, importFeeds.id))
    .where(eq(importSessions.fixedPart, getFixedPart(sessionId)))
    .limit(1)

  if (!row || !row.isActive || !row.passwordMd5 || row.softwareKey === null) {
    throw new RpcStatusError(STATUS.badSession, 'Neplatné přihlášení')
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(importSessions).where(eq(importSessions.id, row.sessionRowId))
    throw new RpcStatusError(STATUS.badSession, 'Relace vypršela')
  }
  const credentials = { passwordMd5: row.passwordMd5, softwareKey: row.softwareKey }
  if (!matchesExpectedSessionId(sessionId, row.storedSessionId, credentials)) {
    throw new RpcStatusError(STATUS.badSession, 'Neplatné přihlášení')
  }
  if (requireLoggedIn && !row.isAuthorized) {
    throw new RpcStatusError(STATUS.badSession, 'Relace není přihlášená')
  }
  if (!row.createdByUserId) {
    throw new RpcStatusError(STATUS.badSession, 'Importní kanál nemá vlastníka')
  }

  await db
    .update(importSessions)
    .set({ sessionId, expiresAt: new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS) })
    .where(eq(importSessions.id, row.sessionRowId))

  return {
    sessionRowId: row.sessionRowId,
    feed: { id: row.feedId, agencyId: row.agencyId, createdByUserId: row.createdByUserId },
  }
}

/** getHash — zahájení relace; klient se identifikuje číselným client_id. */
async function handleGetHash(params: XmlRpcValue[]): Promise<RpcResponse> {
  const clientId =
    typeof params[0] === 'number' ? params[0] : Number.parseInt(String(params[0]), 10)
  if (!Number.isInteger(clientId)) {
    throw new RpcStatusError(STATUS.unknownClient, 'Neexistující klient')
  }

  const db = getDb()
  const [feed] = await db
    .select({ id: importFeeds.id })
    .from(importFeeds)
    .where(and(eq(importFeeds.clientId, clientId), eq(importFeeds.isActive, true)))
    .limit(1)
  if (!feed) throw new RpcStatusError(STATUS.unknownClient, 'Neexistující klient')

  const sessionId = createSessionId()
  await db.insert(importSessions).values({
    feedId: feed.id,
    fixedPart: getFixedPart(sessionId),
    sessionId,
    expiresAt: new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS),
  })

  return ok({ sessionId })
}

async function handleLogin(params: XmlRpcValue[]): Promise<RpcResponse> {
  const session = await resolveSession(requireString(params, 0, 'session_id'), false)
  await getDb()
    .update(importSessions)
    .set({ isAuthorized: true })
    .where(eq(importSessions.id, session.sessionRowId))
  return ok()
}

async function handleLogout(params: XmlRpcValue[]): Promise<RpcResponse> {
  const session = await resolveSession(requireString(params, 0, 'session_id'), true)
  await getDb().delete(importSessions).where(eq(importSessions.id, session.sessionRowId))
  return ok()
}

/** Identifikátor inzerátu u kanceláře; podle něj se inzerát zakládá i edituje. */
function readAdvertRkid(advert: SrealityAdvert): string {
  const rkid = advert.advert_rkid
  if (typeof rkid === 'string' && rkid.trim()) return rkid.trim()
  if (typeof rkid === 'number') return String(rkid)
  throw new RpcStatusError(
    STATUS.incompleteData,
    'Chybí advert_rkid — rozhraní portálu identifikuje inzeráty podle id kanceláře',
  )
}

async function handleAddAdvert(params: XmlRpcValue[]): Promise<RpcResponse> {
  const session = await resolveSession(requireString(params, 0, 'session_id'), true)
  const advert = requireStruct(params, 1, 'advert_data')
  const externalId = readAdvertRkid(advert)

  const result = await importListing(session.feed, mapAdvertToImportInput(advert, externalId))

  const [row] = await getDb()
    .select({ seq: listings.seq })
    .from(listings)
    .where(eq(listings.id, result.listingId))
    .limit(1)

  return ok({ advert_id: row?.seq ?? 0 })
}

/**
 * delAdvert — inzerát se označí za smazaný, nemaže se z databáze. Opětovný
 * import stejného advert_rkid ho podle stávající logiky importu oživí.
 */
async function handleDelAdvert(params: XmlRpcValue[]): Promise<RpcResponse> {
  const session = await resolveSession(requireString(params, 0, 'session_id'), true)
  const advertRkid = typeof params[2] === 'string' ? params[2].trim() : ''
  const advertId = typeof params[1] === 'number' ? params[1] : 0

  const db = getDb()
  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.importFeedId, session.feed.id),
        isNull(listings.deletedAt),
        advertRkid ? eq(listings.externalId, advertRkid) : eq(listings.seq, advertId),
      ),
    )
    .limit(1)

  // Neexistující inzerát není chyba — protokol na opakované smazání vrací OK.
  if (!listing) return ok()

  await db.update(listings).set({ deletedAt: new Date() }).where(eq(listings.id, listing.id))
  return ok()
}

/** listAdvert — přehled inzerátů kanálu, aby si exportní software mohl porovnat stav. */
async function handleListAdvert(params: XmlRpcValue[]): Promise<RpcResponse> {
  const session = await resolveSession(requireString(params, 0, 'session_id'), true)
  const rows = await getDb()
    .select({ seq: listings.seq, externalId: listings.externalId, status: listings.status })
    .from(listings)
    .where(and(eq(listings.importFeedId, session.feed.id), isNull(listings.deletedAt)))

  return ok(
    rows.map((row) => ({
      advert_id: row.seq,
      advert_rkid: row.externalId ?? '',
      status: row.status,
    })),
  )
}

const HANDLERS: Record<string, (params: XmlRpcValue[]) => Promise<RpcResponse>> = {
  getHash: handleGetHash,
  login: handleLogin,
  logout: handleLogout,
  addAdvert: handleAddAdvert,
  delAdvert: handleDelAdvert,
  listAdvert: handleListAdvert,
}

export class UnknownRpcMethodError extends Error {}

/**
 * Zpracuje volání importního XML-RPC rozhraní. Chyby zpracování se vrací
 * návratovým kódem ve struktuře odpovědi, ne XML-RPC faultem — fault je
 * vyhrazený pro chyby protokolu.
 */
export async function handleImportRpcCall(call: XmlRpcMethodCall): Promise<RpcResponse> {
  if (call.methodName === 'version') {
    return ok({ version: INTERFACE_VERSION })
  }

  const handler = HANDLERS[call.methodName]
  if (!handler) throw new UnknownRpcMethodError(`Neznámá metoda ${call.methodName}`)

  try {
    return await handler(call.params)
  } catch (error) {
    if (error instanceof RpcStatusError) {
      return { status: error.status, statusMessage: error.message, output: {} }
    }
    if (error instanceof AdvertMappingError || error instanceof ImportValidationError) {
      return { status: STATUS.incompleteData, statusMessage: error.message, output: {} }
    }
    throw error
  }
}
