import { describe, expect, it } from 'vitest'
import {
  XmlRpcParseError,
  parseMethodCall,
  serializeFault,
  serializeMethodResponse,
} from './xml-rpc'

function methodCall(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><methodCall>${body}</methodCall>`
}

describe('parseMethodCall', () => {
  it('přečte název metody i bez parametrů', () => {
    const call = parseMethodCall(methodCall('<methodName>version</methodName>'))

    expect(call.methodName).toBe('version')
    expect(call.params).toEqual([])
  })

  it('přečte skalární parametry včetně typů', () => {
    const call = parseMethodCall(
      methodCall(`<methodName>getHash</methodName><params>
        <param><value><int>4242</int></value></param>
        <param><value><boolean>1</boolean></value></param>
        <param><value><double>1234.5</double></value></param>
      </params>`),
    )

    expect(call.params).toEqual([4242, true, 1234.5])
  })

  it('hodnota bez typové značky je řetězec', () => {
    const call = parseMethodCall(
      methodCall(
        '<methodName>login</methodName><params><param><value>abc123</value></param></params>',
      ),
    )

    expect(call.params).toEqual(['abc123'])
  })

  it('rozparsuje strukturu inzerátu z addAdvert', () => {
    const call = parseMethodCall(
      methodCall(`<methodName>addAdvert</methodName><params>
        <param><value><string>session-xyz</string></value></param>
        <param><value><struct>
          <member><name>advert_rkid</name><value><string>RK-001</string></value></member>
          <member><name>advert_function</name><value><int>1</int></value></member>
          <member><name>advert_price</name><value><double>5500000</double></value></member>
          <member><name>elevator</name><value><boolean>1</boolean></value></member>
        </struct></value></param>
      </params>`),
    )

    expect(call.methodName).toBe('addAdvert')
    expect(call.params[0]).toBe('session-xyz')
    expect(call.params[1]).toEqual({
      advert_rkid: 'RK-001',
      advert_function: 1,
      advert_price: 5_500_000,
      elevator: true,
    })
  })

  it('rozparsuje pole hodnot', () => {
    const call = parseMethodCall(
      methodCall(`<methodName>x</methodName><params><param><value><array><data>
        <value><int>1</int></value>
        <value><string>dva</string></value>
      </data></array></value></param></params>`),
    )

    expect(call.params[0]).toEqual([1, 'dva'])
  })

  it('dekóduje base64 u fotky', () => {
    const call = parseMethodCall(
      methodCall(
        `<methodName>addPhoto</methodName><params><param><value><base64>${Buffer.from('foto').toString('base64')}</base64></value></param></params>`,
      ),
    )

    expect(call.params[0]).toEqual(Buffer.from('foto'))
  })

  it('přijme datum v kompaktním ISO tvaru', () => {
    const call = parseMethodCall(
      methodCall(
        '<methodName>x</methodName><params><param><value><dateTime.iso8601>20260615T14:30:00</dateTime.iso8601></value></param></params>',
      ),
    )

    expect(call.params[0]).toEqual(new Date('2026-06-15T14:30:00Z'))
  })

  it('zachová text popisu z CDATA i s entitami', () => {
    const call = parseMethodCall(
      methodCall(
        '<methodName>x</methodName><params><param><value><string><![CDATA[Byt 2+kk <nej>]]></string></value></param></params>',
      ),
    )

    expect(call.params[0]).toBe('Byt 2+kk <nej>')
  })

  it('dekóduje předdefinované entity', () => {
    const call = parseMethodCall(
      methodCall(
        '<methodName>x</methodName><params><param><value><string>Byt &amp; d&#367;m</string></value></param></params>',
      ),
    )

    expect(call.params[0]).toBe('Byt & dům')
  })
})

describe('parseMethodCall — odolnost proti nebezpečnému vstupu', () => {
  it('odmítne DOCTYPE (XXE)', () => {
    const xml = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><methodCall><methodName>x</methodName></methodCall>`

    expect(() => parseMethodCall(xml)).toThrow(XmlRpcParseError)
  })

  it('odmítne vlastní entitu', () => {
    const xml = methodCall(
      '<methodName>x</methodName><params><param><value><string>&xxe;</string></value></param></params>',
    )

    expect(() => parseMethodCall(xml)).toThrow(/Nepodporovaná XML entita/)
  })

  it('odmítne příliš hluboké zanoření', () => {
    const depth = 40
    const inner = '<value><int>1</int></value>'
    const nested =
      '<value><array><data>'.repeat(depth) + inner + '</data></array></value>'.repeat(depth)
    const xml = methodCall(`<methodName>x</methodName><params><param>${nested}</param></params>`)

    expect(() => parseMethodCall(xml)).toThrow(/hloubka zanoření/)
  })

  it('odmítne požadavek bez názvu metody', () => {
    expect(() => parseMethodCall(methodCall('<methodName></methodName>'))).toThrow(
      /Chybí název metody/,
    )
  })
})

describe('serializeMethodResponse', () => {
  it('sestaví odpověď se strukturou status/statusMessage/output', () => {
    const xml = serializeMethodResponse({
      status: 200,
      statusMessage: 'OK',
      output: { advert_id: 12345 },
    })

    expect(xml).toContain('<methodResponse><params><param>')
    expect(xml).toContain('<name>status</name><value><int>200</int></value>')
    expect(xml).toContain('<name>statusMessage</name><value><string>OK</string></value>')
    expect(xml).toContain('<name>advert_id</name><value><int>12345</int></value>')
  })

  it('ošetří speciální znaky v textu', () => {
    const xml = serializeMethodResponse({ statusMessage: 'Chyba <b> & "konec"' })

    expect(xml).toContain('Chyba &lt;b&gt; &amp; &quot;konec&quot;')
  })

  it('odpověď jde znovu rozparsovat jako hodnota', () => {
    const original = { status: 200, output: { sessionId: 'abc', items: [1, 2] } }
    const xml = serializeMethodResponse(original)
    // Odpověď obalíme do methodCall, aby ji šlo prohnat stejným parserem.
    const asCall = xml
      .replace('<methodResponse><params>', '<methodCall><methodName>x</methodName><params>')
      .replace('</params></methodResponse>', '</params></methodCall>')

    expect(parseMethodCall(asCall).params[0]).toEqual(original)
  })
})

describe('serializeFault', () => {
  it('sestaví fault odpověď', () => {
    const xml = serializeFault(500, 'Neočekávaná chyba')

    expect(xml).toContain('<fault>')
    expect(xml).toContain('<name>faultCode</name><value><int>500</int></value>')
    expect(xml).toContain(
      '<name>faultString</name><value><string>Neočekávaná chyba</string></value>',
    )
  })
})
