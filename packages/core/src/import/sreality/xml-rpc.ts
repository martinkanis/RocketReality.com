/**
 * XML-RPC kodek pro importní rozhraní kompatibilní se sreality.
 *
 * Vlastní implementace místo knihovny: gramatika XML-RPC je malá a uzavřená,
 * takže parser přijímá jen její elementy a rovnou odmítá DOCTYPE i vlastní
 * entity (ochrana proti XXE a expanzi entit), což obecné XML parsery
 * ve výchozím nastavení nedělají.
 */

const MAX_NESTING_DEPTH = 32

export type XmlRpcValue =
  string | number | boolean | Date | Buffer | XmlRpcValue[] | { [key: string]: XmlRpcValue }

export interface XmlRpcMethodCall {
  methodName: string
  params: XmlRpcValue[]
}

export class XmlRpcParseError extends Error {}

type Token =
  | { kind: 'open'; name: string; selfClosing: boolean }
  | { kind: 'close'; name: string }
  | { kind: 'text'; value: string }

const PREDEFINED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
}

/** Dekóduje jen předdefinované a číselné entity — vlastní entity jsou chyba. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    }
    const decoded = PREDEFINED_ENTITIES[entity]
    if (decoded === undefined) {
      throw new XmlRpcParseError(`Nepodporovaná XML entita: ${match}`)
    }
    return decoded
  })
}

function readTagName(xml: string, start: number): string {
  let end = start
  while (end < xml.length && !/[\s/>]/.test(xml[end]!)) end++
  return xml.slice(start, end)
}

function tokenize(xml: string): Token[] {
  const tokens: Token[] = []
  let cursor = 0

  while (cursor < xml.length) {
    const nextTag = xml.indexOf('<', cursor)
    if (nextTag === -1) break

    if (nextTag > cursor) {
      const text = xml.slice(cursor, nextTag)
      if (text.trim()) tokens.push({ kind: 'text', value: decodeEntities(text) })
    }

    if (xml.startsWith('<!DOCTYPE', nextTag) || xml.startsWith('<!ENTITY', nextTag)) {
      throw new XmlRpcParseError('DOCTYPE ani vlastní entity nejsou v požadavku povolené')
    }

    if (xml.startsWith('<![CDATA[', nextTag)) {
      const end = xml.indexOf(']]>', nextTag)
      if (end === -1) throw new XmlRpcParseError('Neuzavřená CDATA sekce')
      tokens.push({ kind: 'text', value: xml.slice(nextTag + 9, end) })
      cursor = end + 3
      continue
    }

    if (xml.startsWith('<!--', nextTag)) {
      const end = xml.indexOf('-->', nextTag)
      if (end === -1) throw new XmlRpcParseError('Neuzavřený komentář')
      cursor = end + 3
      continue
    }

    if (xml.startsWith('<?', nextTag)) {
      const end = xml.indexOf('?>', nextTag)
      if (end === -1) throw new XmlRpcParseError('Neuzavřená XML deklarace')
      cursor = end + 2
      continue
    }

    const tagEnd = xml.indexOf('>', nextTag)
    if (tagEnd === -1) throw new XmlRpcParseError('Neuzavřená značka')

    if (xml[nextTag + 1] === '/') {
      tokens.push({ kind: 'close', name: readTagName(xml, nextTag + 2) })
    } else {
      tokens.push({
        kind: 'open',
        name: readTagName(xml, nextTag + 1),
        selfClosing: xml[tagEnd - 1] === '/',
      })
    }
    cursor = tagEnd + 1
  }

  return tokens
}

/** Kurzor nad tokeny — parser čte dopředu a nikdy se nevrací. */
class TokenReader {
  private index = 0

  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.index]
  }

  next(): Token {
    const token = this.tokens[this.index]
    if (!token) throw new XmlRpcParseError('Neočekávaný konec dokumentu')
    this.index++
    return token
  }

  expectOpen(name: string): void {
    const token = this.next()
    if (token.kind !== 'open' || token.name !== name) {
      throw new XmlRpcParseError(`Očekáván element <${name}>`)
    }
  }

  expectClose(name: string): void {
    const token = this.next()
    if (token.kind !== 'close' || token.name !== name) {
      throw new XmlRpcParseError(`Očekáván uzavírací element </${name}>`)
    }
  }

  readTextUntilClose(name: string): string {
    let text = ''
    for (;;) {
      const token = this.next()
      if (token.kind === 'text') {
        text += token.value
        continue
      }
      if (token.kind === 'close' && token.name === name) return text
      throw new XmlRpcParseError(`Element <${name}> smí obsahovat jen text`)
    }
  }
}

function parseInteger(raw: string): number {
  const value = Number.parseInt(raw.trim(), 10)
  if (Number.isNaN(value)) throw new XmlRpcParseError(`Neplatné celé číslo: "${raw}"`)
  return value
}

function parseDouble(raw: string): number {
  const value = Number.parseFloat(raw.trim())
  if (Number.isNaN(value)) throw new XmlRpcParseError(`Neplatné desetinné číslo: "${raw}"`)
  return value
}

/** Datum v ISO 8601 bez oddělovačů (20150615T14:30:00) i s nimi. */
function parseDateTime(raw: string): Date {
  const text = raw.trim()
  const compact = /^(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(text)
  const isoText = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}Z`
    : text
  const value = new Date(isoText)
  if (Number.isNaN(value.getTime())) throw new XmlRpcParseError(`Neplatné datum: "${raw}"`)
  return value
}

function parseScalar(reader: TokenReader, type: string): XmlRpcValue {
  const raw = reader.readTextUntilClose(type)
  switch (type) {
    case 'i4':
    case 'int':
      return parseInteger(raw)
    case 'boolean':
      return raw.trim() === '1' || raw.trim().toLowerCase() === 'true'
    case 'double':
      return parseDouble(raw)
    case 'dateTime.iso8601':
      return parseDateTime(raw)
    case 'base64':
      return Buffer.from(raw.trim(), 'base64')
    default:
      return raw
  }
}

function parseStruct(reader: TokenReader, depth: number): Record<string, XmlRpcValue> {
  const result: Record<string, XmlRpcValue> = {}
  for (;;) {
    const token = reader.peek()
    if (token?.kind === 'close' && token.name === 'struct') {
      reader.next()
      return result
    }
    reader.expectOpen('member')
    reader.expectOpen('name')
    const name = reader.readTextUntilClose('name')
    const value = parseValue(reader, depth + 1)
    reader.expectClose('member')
    result[name] = value
  }
}

function parseArray(reader: TokenReader, depth: number): XmlRpcValue[] {
  reader.expectOpen('data')
  const items: XmlRpcValue[] = []
  for (;;) {
    const token = reader.peek()
    if (token?.kind === 'close' && token.name === 'data') {
      reader.next()
      reader.expectClose('array')
      return items
    }
    items.push(parseValue(reader, depth + 1))
  }
}

function parseValue(reader: TokenReader, depth: number): XmlRpcValue {
  if (depth > MAX_NESTING_DEPTH) {
    throw new XmlRpcParseError('Překročena maximální hloubka zanoření')
  }
  reader.expectOpen('value')

  const token = reader.peek()
  // <value>text</value> bez typové značky je podle specifikace řetězec.
  if (!token || token.kind === 'text') {
    return reader.readTextUntilClose('value')
  }
  if (token.kind === 'close') {
    reader.next()
    return ''
  }

  reader.next()
  const type = token.name
  let value: XmlRpcValue
  if (token.selfClosing) {
    value = ''
  } else if (type === 'struct') {
    value = parseStruct(reader, depth)
  } else if (type === 'array') {
    value = parseArray(reader, depth)
  } else {
    value = parseScalar(reader, type)
  }
  reader.expectClose('value')
  return value
}

/** Rozparsuje XML-RPC požadavek na název metody a její parametry. */
export function parseMethodCall(xml: string): XmlRpcMethodCall {
  const reader = new TokenReader(tokenize(xml))
  reader.expectOpen('methodCall')
  reader.expectOpen('methodName')
  const methodName = reader.readTextUntilClose('methodName').trim()
  if (!methodName) throw new XmlRpcParseError('Chybí název metody')

  const params: XmlRpcValue[] = []
  const afterName = reader.peek()
  if (afterName?.kind === 'open' && afterName.name === 'params') {
    reader.next()
    for (;;) {
      const token = reader.peek()
      if (token?.kind === 'close' && token.name === 'params') {
        reader.next()
        break
      }
      reader.expectOpen('param')
      params.push(parseValue(reader, 0))
      reader.expectClose('param')
    }
  }

  return { methodName, params }
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatDateTime(value: Date): string {
  const iso = value.toISOString()
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 19)}`
}

function serializeValue(value: XmlRpcValue): string {
  if (typeof value === 'string') return `<value><string>${escapeXml(value)}</string></value>`
  if (typeof value === 'boolean') return `<value><boolean>${value ? 1 : 0}</boolean></value>`
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? `<value><int>${value}</int></value>`
      : `<value><double>${value}</double></value>`
  }
  if (value instanceof Date) {
    return `<value><dateTime.iso8601>${formatDateTime(value)}</dateTime.iso8601></value>`
  }
  if (Buffer.isBuffer(value)) {
    return `<value><base64>${value.toString('base64')}</base64></value>`
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

/** Sestaví úspěšnou odpověď serveru s jedinou návratovou hodnotou. */
export function serializeMethodResponse(value: XmlRpcValue): string {
  return `<?xml version="1.0" encoding="UTF-8"?><methodResponse><params><param>${serializeValue(value)}</param></params></methodResponse>`
}

/** Sestaví chybovou odpověď (fault) — použije se jen pro chyby protokolu. */
export function serializeFault(faultCode: number, faultString: string): string {
  const fault = serializeValue({ faultCode, faultString })
  return `<?xml version="1.0" encoding="UTF-8"?><methodResponse><fault>${fault}</fault></methodResponse>`
}
