import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API pro import inzerátů',
  description:
    'Dokumentace rozhraní pro automatické vkládání a aktualizaci inzerátů na RocketReality z realitního softwaru.',
}

const API_BASE_URL = 'https://rocketnemovitosti.cz'
const IMPORT_ENDPOINT_PATH = '/api/import/inzeraty'

const REQUEST_EXAMPLE = `curl -X POST ${API_BASE_URL}${IMPORT_ENDPOINT_PATH} \\
  -H "Authorization: Bearer VAS_API_KLIC" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalId": "rk-1024",
    "sourceUrl": "https://www.vase-rk.cz/nemovitosti/rodinny-dum-opava",
    "title": "Rodinný dům 5+kk se zahradou, Opava",
    "description": "Prostorný dům s garáží a udržovanou zahradou…",
    "offerType": "sale",
    "propertyType": "house",
    "price": 8900000,
    "priceNote": "k jednání",
    "currency": "CZK",
    "size": 145,
    "location": {
      "street": "Javorová 18",
      "city": "Opava",
      "postalCode": "74601",
      "region": "moravskoslezsky"
    },
    "photos": [
      { "url": "https://www.vase-rk.cz/foto/dum-1.jpg", "alt": "Pohled na dům" }
    ],
    "agent": {
      "name": "Jan Novák",
      "email": "jan.novak@vase-rk.cz",
      "phone": "+420 777 123 456"
    }
  }'`

type FieldRow = {
  description: string
  name: string
  required: string
  type: string
}

const FIELD_ROWS: FieldRow[] = [
  {
    name: 'externalId',
    type: 'string',
    required: 'ano',
    description:
      'Stálý identifikátor inzerátu ve vašem systému. Opakované odeslání se stejným externalId inzerát aktualizuje, nevytvoří duplicitu.',
  },
  {
    name: 'title',
    type: 'string',
    required: 'ano',
    description: 'Titulek inzerátu.',
  },
  {
    name: 'sourceUrl',
    type: 'string (URL)',
    required: 'ne',
    description: 'Odkaz na inzerát ve zdrojovém systému.',
  },
  {
    name: 'description',
    type: 'string | null',
    required: 'ne',
    description: 'Popis nemovitosti v prostém textu.',
  },
  {
    name: 'offerType',
    type: '"sale" | "rent" | "other"',
    required: 'ano',
    description: 'Typ nabídky — prodej, pronájem, jiné.',
  },
  {
    name: 'propertyType',
    type: 'string | null',
    required: 'ne',
    description: 'Druh nemovitosti, např. "apartment", "house", "land", "commercial".',
  },
  {
    name: 'price',
    type: 'number | null',
    required: 'ne',
    description: 'Cena v Kč. Null znamená cenu na vyžádání.',
  },
  {
    name: 'priceNote',
    type: 'string',
    required: 'ne',
    description: 'Poznámka k ceně, např. "k jednání" nebo "včetně provize".',
  },
  {
    name: 'currency',
    type: '"CZK"',
    required: 'ano',
    description: 'Měna ceny. Aktuálně podporujeme pouze CZK.',
  },
  {
    name: 'size',
    type: 'number',
    required: 'ne',
    description: 'Užitná plocha v m².',
  },
  {
    name: 'location',
    type: 'objekt',
    required: 'ano',
    description: 'Adresa nemovitosti: street, city, postalCode, region.',
  },
  {
    name: 'photos',
    type: 'pole objektů',
    required: 'ano',
    description:
      'Fotografie jako { url, alt }. Adresy musí být veřejně dostupné — portál si fotografie stáhne při zpracování.',
  },
  {
    name: 'agent',
    type: 'objekt | null',
    required: 'ne',
    description: 'Kontakt na makléře: name, email, phone. Zobrazí se u inzerátu.',
  },
]

const RESPONSE_ROWS = [
  { status: '200', meaning: 'Inzerát byl přijat ke zpracování (vytvoření nebo aktualizace).' },
  { status: '401', meaning: 'Chybějící nebo neplatný API klíč.' },
  { status: '422', meaning: 'Tělo požadavku neprošlo validací — odpověď obsahuje popis chyb.' },
  { status: '429', meaning: 'Příliš mnoho požadavků — zkuste to znovu později.' },
  { status: '5xx', meaning: 'Chyba na naší straně — požadavek bezpečně zopakujte.' },
] as const

export default function ApiDokumentacePage() {
  return (
    <article>
      <h1 className="text-3xl font-semibold">API pro import inzerátů</h1>
      <p className="mt-4 leading-relaxed">
        Rozhraní pro realitní kanceláře a výrobce realitního softwaru, kteří chtějí inzeráty na
        RocketReality vkládat a aktualizovat automaticky. Import funguje jako jednoduché REST API —
        jeden HTTP požadavek na inzerát, formát JSON.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Získání API klíče</h2>
        <p className="mt-3 leading-relaxed">
          Klíč si vytvoříte sami po přihlášení v sekci{' '}
          <a href="/muj-ucet/api-klice" className="underline">
            Můj účet → API klíče
          </a>
          . Zobrazí se jedinkrát při vytvoření, uložte si ho bezpečně. Importované inzeráty se
          zakládají pod vaším účtem (a vaší realitní kanceláří, pokud v ní jste), klíč můžete
          kdykoli deaktivovat. S dotazy se ozvěte na{' '}
          <a href="mailto:obchod@rocketreality.cz" className="underline">
            obchod@rocketreality.cz
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Endpoint</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-950 p-4 text-sm text-brand-100">
          {`POST ${API_BASE_URL}${IMPORT_ENDPOINT_PATH}
Authorization: Bearer {váš API klíč}
Content-Type: application/json`}
        </pre>
        <p className="mt-3 leading-relaxed">
          Každý požadavek odešle jeden inzerát. Opakované odeslání se stejným{' '}
          <code className="rounded bg-brand-50 px-1 font-mono text-sm">externalId</code> stávající
          inzerát aktualizuje — duplicity nevznikají.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Pole požadavku</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200">
                <th className="py-2 pr-4 font-semibold">Pole</th>
                <th className="py-2 pr-4 font-semibold">Typ</th>
                <th className="py-2 pr-4 font-semibold">Povinné</th>
                <th className="py-2 font-semibold">Popis</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_ROWS.map((row) => (
                <tr key={row.name} className="border-b border-brand-100 align-top">
                  <td className="py-2 pr-4 font-mono">{row.name}</td>
                  <td className="py-2 pr-4 font-mono">{row.type}</td>
                  <td className="py-2 pr-4">{row.required}</td>
                  <td className="py-2 leading-relaxed">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Příklad požadavku</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-950 p-4 text-sm text-brand-100">
          {REQUEST_EXAMPLE}
        </pre>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Odpovědi</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200">
                <th className="py-2 pr-4 font-semibold">Stav</th>
                <th className="py-2 font-semibold">Význam</th>
              </tr>
            </thead>
            <tbody>
              {RESPONSE_ROWS.map((row) => (
                <tr key={row.status} className="border-b border-brand-100 align-top">
                  <td className="py-2 pr-4 font-mono">{row.status}</td>
                  <td className="py-2 leading-relaxed">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Moderace a zveřejnění</h2>
        <p className="mt-3 leading-relaxed">
          Importované inzeráty procházejí stejnou moderací jako inzeráty vložené ručně. Po schválení
          se zveřejní; aktualizace již schválených inzerátů se propisují automaticky. Za obsah
          inzerátů odpovídá inzerující kancelář — viz{' '}
          <a href="/podminky" className="underline">
            podmínky užití
          </a>
          .
        </p>
      </section>
    </article>
  )
}
