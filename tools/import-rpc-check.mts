/**
 * Referenční klient importního XML-RPC rozhraní.
 *
 * Projde celý scénář exportu (přihlášení → vložení inzerátu → výpis → úklid)
 * a vypíše, co rozhraní vrátilo. Slouží jako smoke test proti nasazené
 * instanci a jako ukázka pro dodavatele exportního softwaru.
 *
 * Záměrně nemá žádné závislosti na balíčcích portálu — jde spustit samostatně:
 *
 *   pnpm import:check -- --url https://portal.cz/RPC2 \
 *     --client 100001 --password ABC --software-key SW-KEY
 */
import { createHash } from 'node:crypto'

const FIXED_PART_LENGTH = 48
const HTTP_TIMEOUT_MS = 20_000

type RpcValue = string | number | boolean | RpcValue[] | { [key: string]: RpcValue }

interface RpcResponse {
  status: number
  statusMessage: string
  output: RpcValue
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

function requireArg(name: string): string {
  const value = readArg(name)
  if (!value) {
    console.error(`Chybí parametr --${name}`)
    process.exit(2)
  }
  return value
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function serializeValue(value: RpcValue): string {
  if (typeof value === 'string') return `<value><string>${escapeXml(value)}</string></value>`
  if (typeof value === 'boolean') return `<value><boolean>${value ? 1 : 0}</boolean></value>`
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? `<value><int>${value}</int></value>`
      : `<value><double>${value}</double></value>`
  }
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map(serializeValue).join('')}</data></array></value>`
  }
  const members = Object.entries(value)
    .map(
      ([name, member]) =>
        `<member><name>${escapeXml(name)}</name>${serializeValue(member)}</member>`,
    )
    .join('')
  return `<value><struct>${members}</struct></value>`
}

function buildMethodCall(methodName: string, params: RpcValue[]): string {
  const body = params.map((param) => `<param>${serializeValue(param)}</param>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>${methodName}</methodName><params>${body}</params></methodCall>`
}

/** Z odpovědi vytáhne jen to, co klient potřebuje — stav a vybrané hodnoty. */
function parseResponse(xml: string): RpcResponse {
  const fault = /<fault>[\s\S]*?<\/fault>/.exec(xml)
  if (fault) {
    const message =
      /<name>faultString<\/name>\s*<value>(?:<string>)?([\s\S]*?)(?:<\/string>)?<\/value>/.exec(
        fault[0],
      )
    return { status: -1, statusMessage: message?.[1]?.trim() ?? 'Chyba protokolu', output: {} }
  }

  const status = /<name>status<\/name>\s*<value><(?:int|i4)>(\d+)<\/(?:int|i4)>/.exec(xml)
  const message = /<name>statusMessage<\/name>\s*<value><string>([\s\S]*?)<\/string>/.exec(xml)
  const output: Record<string, RpcValue> = {}
  for (const match of xml.matchAll(
    /<name>(sessionId|advert_id|photo_id|version)<\/name>\s*<value>(?:<(?:int|i4|string)>)?([\s\S]*?)(?:<\/(?:int|i4|string)>)?<\/value>/g,
  )) {
    output[match[1]!] = match[2]!.trim()
  }

  return {
    status: status ? Number.parseInt(status[1]!, 10) : 0,
    statusMessage: message?.[1] ?? '',
    output,
  }
}

async function callRpc(url: string, methodName: string, params: RpcValue[]): Promise<RpcResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'text/xml; charset=utf-8' },
    body: buildMethodCall(methodName, params),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${methodName}: server odpověděl HTTP ${response.status}`)
  }
  return parseResponse(await response.text())
}

/** Postup předepsaný protokolem: nové session_id z posledního platného. */
function nextSessionId(current: string, passwordMd5: string, softwareKey: string): string {
  const variablePart = createHash('md5')
    .update(current + passwordMd5 + softwareKey, 'utf8')
    .digest('hex')
  return current.slice(0, FIXED_PART_LENGTH) + variablePart
}

function report(step: string, response: RpcResponse): void {
  const isOk = response.status >= 200 && response.status < 300
  const detail = Object.entries(response.output)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ')
  console.log(
    `${isOk ? 'OK  ' : 'CHYBA'} ${step.padEnd(12)} status=${response.status} ${response.statusMessage} ${detail}`.trimEnd(),
  )
  if (!isOk) process.exitCode = 1
}

const sampleAdvert: Record<string, RpcValue> = {
  advert_rkid: `SMOKE-${Date.now()}`,
  advert_function: 1,
  advert_type: 1,
  advert_subtype: 4,
  advert_price: 4_990_000,
  advert_price_currency: 1,
  advert_price_unit: 1,
  description: 'Zkušební inzerát z referenčního klienta. Po kontrole ho smažte.',
  locality_city: 'Brno',
  locality_street: 'Botanická',
  locality_cp: '68',
  usable_area: 52,
  ownership: 1,
  building_type: 2,
  building_condition: 9,
}

async function main(): Promise<void> {
  const url = requireArg('url')
  const clientId = Number.parseInt(requireArg('client'), 10)
  const passwordMd5 = createHash('md5').update(requireArg('password'), 'utf8').digest('hex')
  const softwareKey = requireArg('software-key')
  const keepAdvert = process.argv.includes('--keep')

  console.log(`Rozhraní: ${url}\nKlient: ${clientId}\n`)

  report('version', await callRpc(url, 'version', []))

  const hashResponse = await callRpc(url, 'getHash', [clientId])
  report('getHash', hashResponse)
  const issuedSessionId = String(hashResponse.output.sessionId ?? '')
  if (!issuedSessionId) {
    console.error('\nRozhraní nevydalo sessionId — zkontrolujte číslo klienta.')
    process.exit(1)
  }

  let sessionId = nextSessionId(issuedSessionId, passwordMd5, softwareKey)
  const loginResponse = await callRpc(url, 'login', [sessionId])
  report('login', loginResponse)
  if (loginResponse.status !== 200) {
    console.error(
      '\nPřihlášení neprošlo. Heslo i klíč softwaru vstupují do stejného otisku,\n' +
        'takže chybu způsobí kterýkoli z nich — ověřte oba.',
    )
    process.exit(1)
  }

  sessionId = nextSessionId(sessionId, passwordMd5, softwareKey)
  const addResponse = await callRpc(url, 'addAdvert', [sessionId, sampleAdvert])
  report('addAdvert', addResponse)

  sessionId = nextSessionId(sessionId, passwordMd5, softwareKey)
  report('listAdvert', await callRpc(url, 'listAdvert', [sessionId]))

  if (!keepAdvert) {
    sessionId = nextSessionId(sessionId, passwordMd5, softwareKey)
    report(
      'delAdvert',
      await callRpc(url, 'delAdvert', [sessionId, 0, String(sampleAdvert.advert_rkid)]),
    )
  }

  sessionId = nextSessionId(sessionId, passwordMd5, softwareKey)
  report('logout', await callRpc(url, 'logout', [sessionId]))

  console.log(
    process.exitCode === 1
      ? '\nNěkterý krok selhal — viz výše.'
      : '\nRozhraní odpovídá podle očekávání.',
  )
}

main().catch((error: unknown) => {
  console.error('Kontrola spadla:', error instanceof Error ? error.message : error)
  process.exit(1)
})
